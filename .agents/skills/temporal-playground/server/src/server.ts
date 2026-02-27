import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { store } from "./store.js";
import type { ServerConfig, WorkflowMetadata, ActivityInfo, ConditionInfo } from "./types.js";

const DEFAULT_HTTP_PORT = 4343;

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

// Resolve public dir relative to the server source (works in bundled dist too)
const __dirname = typeof import.meta.url === "string"
  ? join(fileURLToPath(import.meta.url), "..")
  : process.cwd();
const publicDir = join(__dirname, "..", "..", "public");

const sseClients = new Set<ServerResponse>();

function broadcastEvent(event: string, data: Record<string, unknown>) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}

// ── Workflow Scanner ──────────────────────────────────────────────

function scanWorkflows(projectRoot: string): WorkflowMetadata[] {
  const results: WorkflowMetadata[] = [];
  const appsDir = join(projectRoot, "apps");

  if (!existsSync(appsDir)) return results;

  for (const service of readdirSync(appsDir)) {
    const workflowsDir = join(appsDir, service, "src", "workflows");
    if (!existsSync(workflowsDir) || !statSync(workflowsDir).isDirectory()) continue;

    for (const file of readdirSync(workflowsDir)) {
      if (!file.endsWith(".workflow.ts")) continue;

      const filePath = join(workflowsDir, file);
      const relPath = relative(projectRoot, filePath);
      const content = readFileSync(filePath, "utf-8");

      results.push(parseWorkflowFile(content, relPath, service));
    }
  }

  return results;
}

function parseWorkflowFile(content: string, filePath: string, service: string): WorkflowMetadata {
  // Extract exported async function name
  const fnMatch = content.match(/export\s+async\s+function\s+(\w+)/);
  const name = fnMatch?.[1] || "unknown";

  // Extract activities from proxyActivities
  const activities: ActivityInfo[] = [];
  const activityBlockRegex = /const\s*\{([^}]+)\}\s*=\s*proxyActivities[^(]*\(\{([^}]+)\}\)/gs;
  let actMatch;
  while ((actMatch = activityBlockRegex.exec(content)) !== null) {
    const names = actMatch[1].split(",").map(n => n.split(":")[0].trim()).filter(Boolean);
    const config = actMatch[2];
    const timeoutMatch = config.match(/startToCloseTimeout:\s*["']([^"']+)["']/);
    const maxAttemptsMatch = config.match(/maximumAttempts:\s*(\d+)/);
    const backoffMatch = config.match(/backoffCoefficient:\s*([\d.]+)/);

    for (const actName of names) {
      activities.push({
        name: actName,
        timeout: timeoutMatch?.[1],
        maxAttempts: maxAttemptsMatch ? parseInt(maxAttemptsMatch[1]) : undefined,
        backoffCoefficient: backoffMatch ? parseFloat(backoffMatch[1]) : undefined,
      });
    }
  }

  // Extract signal handlers
  const signals: string[] = [];
  const signalRegex = /setHandler\(\s*(\w*[Ss]ignal\w*)\b/g;
  let sigMatch;
  while ((sigMatch = signalRegex.exec(content)) !== null) {
    signals.push(sigMatch[1]);
  }

  // Extract query handlers
  const queries: string[] = [];
  const queryRegex = /setHandler\(\s*(\w*[Qq]uery\w*)\b/g;
  let qMatch;
  while ((qMatch = queryRegex.exec(content)) !== null) {
    queries.push(qMatch[1]);
  }

  // Extract update handlers
  const updates: string[] = [];
  const updateRegex = /setHandler\(\s*(\w*[Uu]pdate\w*)\b/g;
  let uMatch;
  while ((uMatch = updateRegex.exec(content)) !== null) {
    updates.push(uMatch[1]);
  }

  // Extract child workflows
  const childWorkflows: string[] = [];
  const childRegex = /startChild\(\s*(\w+)/g;
  let cMatch;
  while ((cMatch = childRegex.exec(content)) !== null) {
    childWorkflows.push(cMatch[1]);
  }

  // Extract conditions (excluding allHandlersFinished)
  const conditions: ConditionInfo[] = [];
  const condRegex = /await\s+condition\(\s*(?:\(\)\s*=>)?\s*([^,)]+)(?:,\s*([^)]+))?\)/g;
  let condMatch;
  while ((condMatch = condRegex.exec(content)) !== null) {
    const expr = condMatch[1].trim();
    if (expr !== "allHandlersFinished") {
      conditions.push({
        expression: expr,
        timeout: condMatch[2]?.trim(),
      });
    }
  }

  // Extract state type
  const stateMatch = content.match(/const\s+\w+:\s*(?:Partial<)?(\w+)>?\s*=/);
  const stateType = stateMatch?.[1];

  return {
    name,
    service,
    filePath,
    signals: [...new Set(signals)],
    queries: [...new Set(queries)],
    updates: [...new Set(updates)],
    activities,
    childWorkflows: [...new Set(childWorkflows)],
    conditions,
    stateType,
  };
}

// ── HTTP Server ───────────────────────────────────────────────────

function createHttpServer(port: number, verbose: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", pending_prompts: store.count() }));
        return;
      }

      if (req.method === "GET" && url.pathname === "/prompts") {
        const oldest = store.getOldest();
        if (!oldest) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ prompt: null }));
          return;
        }
        store.removeOldest();
        broadcastEvent("status", { status: "processing" });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(oldest));
        return;
      }

      if (req.method === "POST" && url.pathname === "/prompts/clear") {
        const count = store.count();
        store.clear();
        broadcastEvent("status", { status: "done" });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ cleared: count }));
        return;
      }

      if (req.method === "POST" && url.pathname === "/respond") {
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            const { message } = payload;
            if (!message || typeof message !== "string") {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "message is required" }));
              return;
            }
            broadcastEvent("status", { status: "response", response: message });
            if (verbose) {
              console.error(`[temporal-playground] Sent response to browser (${message.length} chars)`);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
        return;
      }

      if (req.method === "POST" && url.pathname === "/canvas-update") {
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            const { updates } = payload;
            if (!Array.isArray(updates) || updates.length === 0) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "updates array is required" }));
              return;
            }
            broadcastEvent("canvas_update", { updates });
            if (verbose) {
              console.error(`[temporal-playground] Sent ${updates.length} canvas update(s) to browser`);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, count: updates.length }));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
        return;
      }

      if (req.method === "GET" && url.pathname === "/events") {
        res.writeHead(200, {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
        });
        res.write(`event: connected\ndata: ${JSON.stringify({ status: "ok" })}\n\n`);
        sseClients.add(res);
        req.on("close", () => sseClients.delete(res));
        return;
      }

      if (req.method === "POST" && url.pathname === "/prompt") {
        let body = "";
        req.on("data", (chunk: string) => (body += chunk));
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            const { prompt, type: promptType, url: pageUrl, pathname: pagePath } = payload;

            if (!prompt || typeof prompt !== "string") {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "prompt is required" }));
              return;
            }

            const entry = store.add({
              prompt,
              type: promptType === "apply" ? "apply" : "chat",
              url: pageUrl || "",
              pathname: pagePath || "/",
            });

            if (verbose) {
              console.error(`[temporal-playground] Received prompt from ${pagePath} (${prompt.length} chars)`);
            }

            broadcastEvent("status", { status: "received", id: entry.id });

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true, id: entry.id }));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON" }));
          }
        });
        return;
      }

      // ── Static file serving ──────────────────────────────────────
      const safePath = url.pathname.replace(/\.\./g, "").replace(/\/+/g, "/");
      const filePath = safePath === "/" ? join(publicDir, "index.html") : join(publicDir, safePath);

      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const ext = extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        const content = readFileSync(filePath);
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[temporal-playground] Port ${port} is already in use.`);
        resolve();
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      console.error(`[temporal-playground] HTTP server listening on http://localhost:${port}`);
      resolve();
    });
  });
}

// ── MCP Server ────────────────────────────────────────────────────

function createMcpServer(verbose: boolean): Server {
  const server = new Server(
    { name: "temporal-playground", version: "0.0.1" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "temporal_get_prompt",
        description:
          "Get the oldest pending prompt from the Temporal Workflow Builder playground. Returns the prompt text, source URL, and pathname.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "temporal_list_pending",
        description:
          "List all pending prompts from the Temporal Workflow Builder. Shows how many prompts are waiting.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "temporal_clear",
        description:
          "Clear all pending prompts after processing. Use this after acting on prompts from the Temporal Workflow Builder.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
      {
        name: "temporal_watch",
        description:
          "Watch for incoming prompts from the Temporal Workflow Builder. Blocks until a prompt arrives or timeout expires. Call this after opening the workflow builder so you automatically receive prompts when the user clicks 'Send to Claude'.",
        inputSchema: {
          type: "object" as const,
          properties: {
            timeout_seconds: {
              type: "number",
              description: "How long to wait for a prompt (default: 300, max: 600).",
            },
          },
        },
      },
      {
        name: "temporal_respond",
        description:
          "Send a response message back to the Temporal Workflow Builder chat UI. Use this to answer user questions or confirm actions in the playground's chat panel. The message will appear as a Claude response in the browser.",
        inputSchema: {
          type: "object" as const,
          properties: {
            message: {
              type: "string",
              description: "The response message to display in the playground chat.",
            },
          },
          required: ["message"],
        },
      },
      {
        name: "temporal_update_canvas",
        description:
          "Send node updates to the Temporal Workflow Builder canvas. Use this for CHAT mode (Send button) to apply draft changes visually on the canvas WITHOUT modifying code files. Each update finds a node by type and property match, then sets new property values and updates the corresponding widgets.",
        inputSchema: {
          type: "object" as const,
          properties: {
            updates: {
              type: "array",
              description: "Array of node updates to apply on the canvas.",
              items: {
                type: "object",
                properties: {
                  nodeType: {
                    type: "string",
                    description: "LiteGraph node type, e.g. 'workflow/Activity', 'workflow/Signal', 'workflow/Start'.",
                  },
                  match: {
                    type: "object",
                    description: "Properties to match the target node, e.g. { \"activityName\": \"reportPaymentConfirmed\" }.",
                  },
                  set: {
                    type: "object",
                    description: "Properties to update on the matched node, e.g. { \"maxAttempts\": 10 }.",
                  },
                },
                required: ["nodeType", "match", "set"],
              },
            },
          },
          required: ["updates"],
        },
      },
      {
        name: "temporal_scan_workflows",
        description:
          "Scan the monorepo for Temporal workflow files (*.workflow.ts) under apps/*/src/workflows/ and return metadata about each workflow including signals, queries, updates, activities, child workflows, and conditions.",
        inputSchema: {
          type: "object" as const,
          properties: {},
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name } = request.params;

    switch (name) {
      case "temporal_get_prompt": {
        const prompt = store.getOldest();

        if (!prompt) {
          return {
            content: [{ type: "text", text: "No pending prompts from the Temporal Workflow Builder." }],
          };
        }

        broadcastEvent("status", { status: "processing" });

        if (verbose) {
          console.error(`[temporal-playground] Delivering prompt ${prompt.id} (${prompt.type}) from ${prompt.pathname}`);
        }

        const modeLabel = prompt.type === "apply" ? "APPLY CHANGES" : "CHAT";

        return {
          content: [{
            type: "text",
            text: `# Temporal Workflow Prompt [${modeLabel}]\n\n**Source:** ${prompt.url || prompt.pathname}\n**Type:** ${prompt.type}\n**Received:** ${new Date(prompt.timestamp).toLocaleTimeString()}\n\n---\n\n${prompt.prompt}`,
          }],
        };
      }

      case "temporal_list_pending": {
        const all = store.getAll();

        if (all.length === 0) {
          return {
            content: [{ type: "text", text: "No pending prompts." }],
          };
        }

        const list = all
          .map((p, i) => `${i + 1}. ${p.pathname} (${p.prompt.length} chars, ${new Date(p.timestamp).toLocaleTimeString()})`)
          .join("\n");

        return {
          content: [{ type: "text", text: `Pending prompts:\n${list}` }],
        };
      }

      case "temporal_clear": {
        const count = store.count();
        store.clear();
        broadcastEvent("status", { status: "done" });

        return {
          content: [{ type: "text", text: count > 0 ? `Cleared ${count} prompt(s).` : "No prompts to clear." }],
        };
      }

      case "temporal_watch": {
        const toolArgs = request.params.arguments as Record<string, unknown> | undefined;
        const timeoutSec = Math.min(
          typeof toolArgs?.timeout_seconds === "number" ? toolArgs.timeout_seconds : 300,
          600
        );

        if (verbose) {
          console.error(`[temporal-playground] Watching for prompts (timeout: ${timeoutSec}s)`);
        }

        const deadline = Date.now() + timeoutSec * 1000;
        while (Date.now() < deadline) {
          const prompt = store.getOldest();
          if (prompt) {
            broadcastEvent("status", { status: "processing" });
            store.removeOldest();

            if (verbose) {
              console.error(`[temporal-playground] Watch: received prompt ${prompt.id} (${prompt.type}) from ${prompt.pathname}`);
            }

            const watchModeLabel = prompt.type === "apply" ? "APPLY CHANGES" : "CHAT";

            return {
              content: [{
                type: "text",
                text: `# Temporal Workflow Prompt [${watchModeLabel}]\n\n**Source:** ${prompt.url || prompt.pathname}\n**Type:** ${prompt.type}\n**Received:** ${new Date(prompt.timestamp).toLocaleTimeString()}\n\n---\n\n${prompt.prompt}`,
              }],
            };
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return {
          content: [{ type: "text", text: "Watch timed out — no prompts received. The user may not have clicked 'Send to Claude' yet." }],
        };
      }

      case "temporal_respond": {
        const respondArgs = request.params.arguments as Record<string, unknown> | undefined;
        const message = typeof respondArgs?.message === "string" ? respondArgs.message : "";

        if (!message) {
          return {
            content: [{ type: "text", text: "Error: message is required." }],
            isError: true,
          };
        }

        broadcastEvent("status", { status: "response", response: message });

        if (verbose) {
          console.error(`[temporal-playground] Sent response to browser (${message.length} chars)`);
        }

        return {
          content: [{ type: "text", text: `Response sent to the playground chat.` }],
        };
      }

      case "temporal_update_canvas": {
        const canvasArgs = request.params.arguments as Record<string, unknown> | undefined;
        const updates = Array.isArray(canvasArgs?.updates) ? canvasArgs.updates : [];

        if (updates.length === 0) {
          return {
            content: [{ type: "text", text: "Error: updates array is required." }],
            isError: true,
          };
        }

        broadcastEvent("canvas_update", { updates });

        if (verbose) {
          console.error(`[temporal-playground] Sent ${updates.length} canvas update(s) to browser`);
        }

        const summary = updates.map((u: Record<string, unknown>) => {
          const match = u.match as Record<string, unknown>;
          const set = u.set as Record<string, unknown>;
          const matchStr = Object.entries(match || {}).map(([k, v]) => `${k}=${v}`).join(", ");
          const setStr = Object.entries(set || {}).map(([k, v]) => `${k}=${v}`).join(", ");
          return `  - ${u.nodeType} [${matchStr}] → ${setStr}`;
        }).join("\n");

        return {
          content: [{ type: "text", text: `Canvas updated (${updates.length} node(s)):\n${summary}` }],
        };
      }

      case "temporal_scan_workflows": {
        const cwd = process.cwd();
        const workflows = scanWorkflows(cwd);

        if (workflows.length === 0) {
          return {
            content: [{ type: "text", text: "No workflow files found in the project." }],
          };
        }

        const summary = workflows.map(w => {
          const parts = [
            `## ${w.name}`,
            `- **Service:** ${w.service}`,
            `- **File:** ${w.filePath}`,
          ];
          if (w.stateType) parts.push(`- **State:** ${w.stateType}`);
          if (w.activities.length > 0) {
            parts.push(`- **Activities:** ${w.activities.map(a => {
              const detail = [a.name];
              if (a.timeout) detail.push(`timeout: ${a.timeout}`);
              if (a.maxAttempts) detail.push(`retries: ${a.maxAttempts}`);
              return detail.join(" (") + (detail.length > 1 ? ")" : "");
            }).join(", ")}`);
          }
          if (w.signals.length > 0) parts.push(`- **Signals:** ${w.signals.join(", ")}`);
          if (w.queries.length > 0) parts.push(`- **Queries:** ${w.queries.join(", ")}`);
          if (w.updates.length > 0) parts.push(`- **Updates:** ${w.updates.join(", ")}`);
          if (w.childWorkflows.length > 0) parts.push(`- **Child Workflows:** ${w.childWorkflows.join(", ")}`);
          if (w.conditions.length > 0) {
            parts.push(`- **Conditions:** ${w.conditions.map(c => `\`${c.expression}\`${c.timeout ? ` (${c.timeout})` : ""}`).join(", ")}`);
          }
          return parts.join("\n");
        }).join("\n\n");

        return {
          content: [{ type: "text", text: `# Temporal Workflows (${workflows.length} found)\n\n${summary}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ── Start ─────────────────────────────────────────────────────────

export async function startServer(config: Partial<ServerConfig> = {}): Promise<void> {
  const { httpPort = DEFAULT_HTTP_PORT, verbose = false } = config;

  await createHttpServer(httpPort, verbose);

  const mcpServer = createMcpServer(verbose);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  console.error("[temporal-playground] MCP server connected via stdio");
}

export { broadcastEvent };
