import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { store } from "./store.js";
import type {
  ActivityInfo,
  ConditionInfo,
  ServerConfig,
  WorkflowMetadata,
  WorkflowParamInfo,
} from "./types.js";

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
const __dirname =
  typeof import.meta.url === "string"
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

/** Read and parse JSON body from an incoming HTTP request */
function readJsonBody<T = Record<string, unknown>>(
  req: IncomingMessage,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body) as T);
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

/** Send a JSON error response */
function jsonError(res: ServerResponse, status: number, error: string) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error }));
}

/** Send a JSON success response */
function jsonOk(res: ServerResponse, data: Record<string, unknown>) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/** Format a prompt entry for MCP tool response */
function formatPromptResponse(prompt: {
  type: string;
  url: string;
  pathname: string;
  timestamp: number;
  prompt: string;
}) {
  const modeLabel = prompt.type === "apply" ? "APPLY CHANGES" : "CHAT";
  return `# Temporal Workflow Prompt [${modeLabel}]\n\n**Source:** ${prompt.url || prompt.pathname}\n**Type:** ${prompt.type}\n**Received:** ${new Date(prompt.timestamp).toLocaleTimeString()}\n\n---\n\n${prompt.prompt}`;
}

// ── Workflow Scanner ──────────────────────────────────────────────

function scanWorkflows(projectRoot: string): WorkflowMetadata[] {
  const results: WorkflowMetadata[] = [];
  const appsDir = join(projectRoot, "apps");

  if (!existsSync(appsDir)) return results;

  for (const service of readdirSync(appsDir)) {
    const workflowsDir = join(appsDir, service, "src", "workflows");
    if (!existsSync(workflowsDir) || !statSync(workflowsDir).isDirectory())
      continue;

    for (const file of readdirSync(workflowsDir)) {
      if (!file.endsWith(".workflow.ts")) continue;

      const filePath = join(workflowsDir, file);
      const relPath = relative(projectRoot, filePath);
      const content = readFileSync(filePath, "utf-8");

      results.push(parseWorkflowFile(content, relPath, service, projectRoot));
    }
  }

  return results;
}

/**
 * Try to resolve a TypeScript type alias to its fields by scanning the monorepo.
 * Looks for `export type TypeName = { field: type; ... }` patterns.
 * Searches: 1) import sources in the workflow file, 2) packages/core, 3) packages/models
 */
function resolveTypeFields(
  typeName: string,
  workflowContent: string,
  _workflowPath: string,
  projectRoot: string,
): { name: string; type: string }[] {
  // Skip primitive types
  if (
    [
      "string",
      "number",
      "boolean",
      "void",
      "unknown",
      "any",
      "object",
      "never",
    ].includes(typeName)
  )
    return [];
  if (
    typeName.startsWith("{") ||
    typeName.includes("|") ||
    typeName.includes("&")
  )
    return [];

  // Collect search directories from import paths in the workflow file
  const searchDirs: string[] = [];

  // Look at imports to find where this type comes from
  const importRegex = new RegExp(
    `import\\s+(?:type\\s+)?\\{[^}]*\\b${typeName}\\b[^}]*\\}\\s+from\\s+["']([^"']+)["']`,
  );
  const importMatch = workflowContent.match(importRegex);
  if (importMatch) {
    const importPath = importMatch[1];
    // Resolve @projectx/* package paths
    if (importPath.startsWith("@projectx/")) {
      const pkgName = importPath.replace("@projectx/", "").split("/")[0];
      searchDirs.push(join(projectRoot, "packages", pkgName, "src"));
    }
  }

  // Also search common package locations
  searchDirs.push(
    join(projectRoot, "packages", "core", "src"),
    join(projectRoot, "packages", "models", "src"),
  );

  // Search for the type definition
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;
    const fields = searchDirForType(dir, typeName);
    if (fields.length > 0) return fields;
  }

  return [];
}

/** Recursively search a directory for a type definition and extract its fields */
function searchDirForType(
  dir: string,
  typeName: string,
): { name: string; type: string }[] {
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        const result = searchDirForType(fullPath, typeName);
        if (result.length > 0) return result;
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        try {
          const content = readFileSync(fullPath, "utf-8");
          // Match: export type TypeName = { ... }
          const typeRegex = new RegExp(
            `(?:export\\s+)?(?:type|interface)\\s+${typeName}\\s*(?:=\\s*)?\\{([^}]+)\\}`,
            "s",
          );
          const match = content.match(typeRegex);
          if (match) {
            const body = match[1];
            const fields: { name: string; type: string }[] = [];
            // Parse field lines: "fieldName: Type" or "fieldName?: Type"
            const fieldRegex = /(\w+)\??\s*:\s*([^;,\n]+)/g;
            for (const fieldMatch of body.matchAll(fieldRegex)) {
              fields.push({
                name: fieldMatch[1].trim(),
                type: fieldMatch[2].trim(),
              });
            }
            if (fields.length > 0) return fields;
          }
        } catch {
          /* skip unreadable files */
        }
      }
    }
  } catch {
    /* skip unreadable dirs */
  }
  return [];
}

function parseWorkflowFile(
  content: string,
  filePath: string,
  service: string,
  projectRoot: string,
): WorkflowMetadata {
  // Extract exported async function name and its full parameter list
  const fnMatch = content.match(
    /export\s+async\s+function\s+(\w+)\s*\(([^)]*)\)/s,
  );
  const name = fnMatch?.[1] || "unknown";

  // Parse workflow function parameters
  const params: WorkflowParamInfo[] = [];
  if (fnMatch?.[2]) {
    const rawParams = splitParams(fnMatch[2]);
    for (const raw of rawParams) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      // Check for default value (e.g. "state = initialState")
      const eqIdx = trimmed.indexOf("=");
      const hasDefault = eqIdx > 0;
      const beforeDefault = hasDefault
        ? trimmed.slice(0, eqIdx).trim()
        : trimmed;

      const colonIdx = beforeDefault.indexOf(":");
      let pName: string;
      let pType: string;
      if (colonIdx > 0) {
        pName = beforeDefault.slice(0, colonIdx).trim();
        pType = beforeDefault.slice(colonIdx + 1).trim();
      } else {
        pName = beforeDefault;
        pType = hasDefault ? "unknown" : "unknown";
      }

      // Try to resolve the type alias to its fields
      const fields = resolveTypeFields(pType, content, filePath, projectRoot);

      params.push({
        name: pName,
        type: pType,
        fields: fields.length > 0 ? fields : undefined,
        hasDefault,
      });
    }
  }

  // Extract activities from proxyActivities
  const activities: ActivityInfo[] = [];
  const activityBlockRegex =
    /const\s*\{([^}]+)\}\s*=\s*proxyActivities[^(]*\(\{([^}]+)\}\)/gs;
  for (const actMatch of content.matchAll(activityBlockRegex)) {
    const names = actMatch[1]
      .split(",")
      .map((n) => n.split(":")[0].trim())
      .filter(Boolean);
    const config = actMatch[2];
    const timeoutMatch = config.match(
      /startToCloseTimeout:\s*["']([^"']+)["']/,
    );
    const maxAttemptsMatch = config.match(/maximumAttempts:\s*(\d+)/);
    const backoffMatch = config.match(/backoffCoefficient:\s*([\d.]+)/);

    for (const actName of names) {
      activities.push({
        name: actName,
        timeout: timeoutMatch?.[1],
        maxAttempts: maxAttemptsMatch
          ? Number.parseInt(maxAttemptsMatch[1], 10)
          : undefined,
        backoffCoefficient: backoffMatch
          ? Number.parseFloat(backoffMatch[1])
          : undefined,
      });
    }
  }

  // Extract signal handlers
  const signals: string[] = [];
  const signalRegex = /setHandler\(\s*(\w*[Ss]ignal\w*)\b/g;
  for (const sigMatch of content.matchAll(signalRegex)) {
    signals.push(sigMatch[1]);
  }

  // Extract query handlers
  const queries: string[] = [];
  const queryRegex = /setHandler\(\s*(\w*[Qq]uery\w*)\b/g;
  for (const qMatch of content.matchAll(queryRegex)) {
    queries.push(qMatch[1]);
  }

  // Extract update handlers
  const updates: string[] = [];
  const updateRegex = /setHandler\(\s*(\w*[Uu]pdate\w*)\b/g;
  for (const uMatch of content.matchAll(updateRegex)) {
    updates.push(uMatch[1]);
  }

  // Extract child workflows
  const childWorkflows: string[] = [];
  const childRegex = /startChild\(\s*(\w+)/g;
  for (const cMatch of content.matchAll(childRegex)) {
    childWorkflows.push(cMatch[1]);
  }

  // Extract conditions (including allHandlersFinished)
  const conditions: ConditionInfo[] = [];
  const condRegex =
    /await\s+condition\(\s*(?:\(\)\s*=>)?\s*([^,)]+)(?:,\s*([^)]+))?\)/g;
  for (const condMatch of content.matchAll(condRegex)) {
    const expr = condMatch[1].trim();
    conditions.push({
      expression: expr,
      timeout: condMatch[2]?.trim(),
    });
  }

  // Extract state type and initialization body
  const stateMatch = content.match(
    /const\s+\w+:\s*(?:Partial<)?(\w+)>?\s*=\s*/,
  );
  const stateType = stateMatch?.[1];
  let stateInit: string | undefined;
  if (stateMatch) {
    // Extract the object literal after the assignment
    const afterEq = content.slice(
      (stateMatch.index ?? 0) + stateMatch[0].length,
    );
    if (afterEq.trimStart().startsWith("{")) {
      let depth = 0;
      const start = afterEq.indexOf("{");
      for (let i = start; i < afterEq.length; i++) {
        if (afterEq[i] === "{") depth++;
        else if (afterEq[i] === "}") {
          depth--;
          if (depth === 0) {
            stateInit = afterEq.slice(start, i + 1);
            break;
          }
        }
      }
    }
  }

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
    stateInit,
    params,
  };
}

// ── Activity Scanner ────────────────────────────────────────────

interface ScannedActivity {
  name: string;
  service: string;
  filePath: string;
  params: { name: string; type: string }[];
  returnType: string;
}

function scanActivities(projectRoot: string): ScannedActivity[] {
  const results: ScannedActivity[] = [];
  const appsDir = join(projectRoot, "apps");
  if (!existsSync(appsDir)) return results;

  for (const service of readdirSync(appsDir)) {
    // Look for activity files in common locations
    const searchPaths = [
      join(appsDir, service, "src", "app", "activities"),
      join(appsDir, service, "src", "activities"),
    ];

    for (const activitiesDir of searchPaths) {
      if (!existsSync(activitiesDir) || !statSync(activitiesDir).isDirectory())
        continue;

      for (const file of readdirSync(activitiesDir)) {
        if (!file.endsWith(".service.ts") && !file.endsWith(".activities.ts"))
          continue;

        const filePath = join(activitiesDir, file);
        const relPath = relative(projectRoot, filePath);
        const content = readFileSync(filePath, "utf-8");

        results.push(...parseActivityFile(content, relPath, service));
      }
    }
  }

  return results;
}

function parseActivityFile(
  content: string,
  filePath: string,
  service: string,
): ScannedActivity[] {
  const activities: ScannedActivity[] = [];

  // Match async methods in classes (NestJS @Injectable pattern)
  // Pattern: async methodName(param1: Type1, param2: Type2): ReturnType {
  // or: async methodName(param1: Type1, param2: Type2) {
  const methodRegex = /async\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
  for (const match of content.matchAll(methodRegex)) {
    const name = match[1];
    const paramsStr = match[2].trim();
    const returnTypeRaw = match[3]?.trim() || "Promise<unknown>";

    // Skip constructor and private/internal methods
    if (name === "constructor" || name.startsWith("_")) continue;

    // Parse parameters
    const params: { name: string; type: string }[] = [];
    if (paramsStr) {
      // Split by comma, handling generic types with nested angle brackets
      const paramParts = splitParams(paramsStr);
      for (const part of paramParts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        // Skip 'this' parameter and injected dependencies
        if (trimmed.startsWith("this") || trimmed.startsWith("@")) continue;

        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          params.push({
            name: trimmed.slice(0, colonIdx).trim().replace(/\?$/, ""),
            type: trimmed.slice(colonIdx + 1).trim(),
          });
        } else {
          params.push({ name: trimmed, type: "unknown" });
        }
      }
    }

    // Clean up return type
    let returnType = returnTypeRaw;
    if (returnType.endsWith("{")) returnType = returnType.slice(0, -1).trim();

    activities.push({ name, service, filePath, params, returnType });
  }

  return activities;
}

/** Split parameter string by commas, respecting angle bracket depth */
function splitParams(str: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of str) {
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) result.push(current);
  return result;
}

function mergeActivityData(
  scannedActivities: ScannedActivity[],
  workflows: WorkflowMetadata[],
): Array<
  ScannedActivity & {
    config?: {
      timeout?: string;
      maxAttempts?: number;
      backoffCoefficient?: number;
    };
  }
> {
  // Build a lookup from workflow activities (which have config)
  const configMap = new Map<
    string,
    { timeout?: string; maxAttempts?: number; backoffCoefficient?: number }
  >();
  for (const wf of workflows) {
    for (const act of wf.activities) {
      if (!configMap.has(act.name)) {
        configMap.set(act.name, {
          timeout: act.timeout,
          maxAttempts: act.maxAttempts,
          backoffCoefficient: act.backoffCoefficient,
        });
      }
    }
  }

  return scannedActivities.map((act) => ({
    ...act,
    config: configMap.get(act.name),
  }));
}

// ── HTTP Server ───────────────────────────────────────────────────

function createHttpServer(port: number, verbose: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(
      async (req: IncomingMessage, res: ServerResponse) => {
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
          res.end(
            JSON.stringify({ status: "ok", pending_prompts: store.count() }),
          );
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
          try {
            const { message } = await readJsonBody<{ message?: string }>(req);
            if (!message || typeof message !== "string")
              return jsonError(res, 400, "message is required");
            broadcastEvent("status", { status: "response", response: message });
            if (verbose)
              console.error(
                `[temporal-playground] Sent response to browser (${message.length} chars)`,
              );
            jsonOk(res, { success: true });
          } catch {
            jsonError(res, 400, "Invalid JSON");
          }
          return;
        }

        if (req.method === "POST" && url.pathname === "/canvas-update") {
          try {
            const { updates } = await readJsonBody<{ updates?: unknown[] }>(
              req,
            );
            if (!Array.isArray(updates) || updates.length === 0)
              return jsonError(res, 400, "updates array is required");
            broadcastEvent("canvas_update", { updates });
            if (verbose)
              console.error(
                `[temporal-playground] Sent ${updates.length} canvas update(s) to browser`,
              );
            jsonOk(res, { success: true, count: updates.length });
          } catch {
            jsonError(res, 400, "Invalid JSON");
          }
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/activities") {
          const cwd = process.cwd();
          const scanned = scanActivities(cwd);
          const workflows = scanWorkflows(cwd);
          const enriched = mergeActivityData(scanned, workflows);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(enriched));
          return;
        }

        if (req.method === "GET" && url.pathname === "/api/workflows") {
          const cwd = process.cwd();
          const workflows = scanWorkflows(cwd);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(workflows));
          return;
        }

        if (req.method === "GET" && url.pathname === "/events") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*",
          });
          res.write(
            `event: connected\ndata: ${JSON.stringify({ status: "ok" })}\n\n`,
          );
          sseClients.add(res);
          req.on("close", () => sseClients.delete(res));
          return;
        }

        if (req.method === "POST" && url.pathname === "/prompt") {
          try {
            const {
              prompt,
              type: promptType,
              url: pageUrl,
              pathname: pagePath,
            } = await readJsonBody<{
              prompt?: string;
              type?: string;
              url?: string;
              pathname?: string;
            }>(req);
            if (!prompt || typeof prompt !== "string")
              return jsonError(res, 400, "prompt is required");
            const entry = store.add({
              prompt,
              type: promptType === "apply" ? "apply" : "chat",
              url: pageUrl || "",
              pathname: pagePath || "/",
            });
            if (verbose)
              console.error(
                `[temporal-playground] Received prompt from ${pagePath} (${prompt.length} chars)`,
              );
            broadcastEvent("status", { status: "received", id: entry.id });
            jsonOk(res, { success: true, id: entry.id });
          } catch {
            jsonError(res, 400, "Invalid JSON");
          }
          return;
        }

        // ── Static file serving ──────────────────────────────────────
        const safePath = url.pathname.replace(/\.\./g, "").replace(/\/+/g, "/");
        const filePath =
          safePath === "/"
            ? join(publicDir, "index.html")
            : join(publicDir, safePath);

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
      },
    );

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`[temporal-playground] Port ${port} is already in use.`);
        resolve();
      } else {
        reject(err);
      }
    });

    server.listen(port, () => {
      console.error(
        `[temporal-playground] HTTP server listening on http://localhost:${port}`,
      );
      resolve();
    });
  });
}

// ── MCP Server ────────────────────────────────────────────────────

function createMcpServer(verbose: boolean): Server {
  const server = new Server(
    { name: "temporal-playground", version: "0.0.1" },
    { capabilities: { tools: {} } },
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
              description:
                "How long to wait for a prompt (default: 300, max: 600).",
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
              description:
                "The response message to display in the playground chat.",
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
                    description:
                      "LiteGraph node type, e.g. 'workflow/Activity', 'workflow/Signal', 'workflow/Start'.",
                  },
                  match: {
                    type: "object",
                    description:
                      'Properties to match the target node, e.g. { "activityName": "reportPaymentConfirmed" }.',
                  },
                  set: {
                    type: "object",
                    description:
                      'Properties to update on the matched node, e.g. { "maxAttempts": 10 }.',
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
      {
        name: "temporal_scan_activities",
        description:
          "Scan the monorepo for Temporal activity implementation files (*.service.ts under apps/*/src/app/activities/) and return metadata about each activity including method signatures, parameters with types, return types, and retry configuration from workflow files.",
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
            content: [
              {
                type: "text",
                text: "No pending prompts from the Temporal Workflow Builder.",
              },
            ],
          };
        }

        broadcastEvent("status", { status: "processing" });

        if (verbose) {
          console.error(
            `[temporal-playground] Delivering prompt ${prompt.id} (${prompt.type}) from ${prompt.pathname}`,
          );
        }

        return {
          content: [{ type: "text", text: formatPromptResponse(prompt) }],
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
          .map(
            (p, i) =>
              `${i + 1}. ${p.pathname} (${p.prompt.length} chars, ${new Date(p.timestamp).toLocaleTimeString()})`,
          )
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
          content: [
            {
              type: "text",
              text:
                count > 0
                  ? `Cleared ${count} prompt(s).`
                  : "No prompts to clear.",
            },
          ],
        };
      }

      case "temporal_watch": {
        const toolArgs = request.params.arguments as
          | Record<string, unknown>
          | undefined;
        const timeoutSec = Math.min(
          typeof toolArgs?.timeout_seconds === "number"
            ? toolArgs.timeout_seconds
            : 300,
          600,
        );

        if (verbose) {
          console.error(
            `[temporal-playground] Watching for prompts (timeout: ${timeoutSec}s)`,
          );
        }

        const deadline = Date.now() + timeoutSec * 1000;
        while (Date.now() < deadline) {
          const prompt = store.getOldest();
          if (prompt) {
            broadcastEvent("status", { status: "processing" });
            store.removeOldest();

            if (verbose) {
              console.error(
                `[temporal-playground] Watch: received prompt ${prompt.id} (${prompt.type}) from ${prompt.pathname}`,
              );
            }

            return {
              content: [{ type: "text", text: formatPromptResponse(prompt) }],
            };
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return {
          content: [
            {
              type: "text",
              text: "Watch timed out — no prompts received. The user may not have clicked 'Send to Claude' yet.",
            },
          ],
        };
      }

      case "temporal_respond": {
        const respondArgs = request.params.arguments as
          | Record<string, unknown>
          | undefined;
        const message =
          typeof respondArgs?.message === "string" ? respondArgs.message : "";

        if (!message) {
          return {
            content: [{ type: "text", text: "Error: message is required." }],
            isError: true,
          };
        }

        broadcastEvent("status", { status: "response", response: message });

        if (verbose) {
          console.error(
            `[temporal-playground] Sent response to browser (${message.length} chars)`,
          );
        }

        return {
          content: [
            { type: "text", text: "Response sent to the playground chat." },
          ],
        };
      }

      case "temporal_update_canvas": {
        const canvasArgs = request.params.arguments as
          | Record<string, unknown>
          | undefined;
        const updates = Array.isArray(canvasArgs?.updates)
          ? canvasArgs.updates
          : [];

        if (updates.length === 0) {
          return {
            content: [
              { type: "text", text: "Error: updates array is required." },
            ],
            isError: true,
          };
        }

        broadcastEvent("canvas_update", { updates });

        if (verbose) {
          console.error(
            `[temporal-playground] Sent ${updates.length} canvas update(s) to browser`,
          );
        }

        const summary = updates
          .map((u: Record<string, unknown>) => {
            const match = u.match as Record<string, unknown>;
            const set = u.set as Record<string, unknown>;
            const matchStr = Object.entries(match || {})
              .map(([k, v]) => `${k}=${v}`)
              .join(", ");
            const setStr = Object.entries(set || {})
              .map(([k, v]) => `${k}=${v}`)
              .join(", ");
            return `  - ${u.nodeType} [${matchStr}] → ${setStr}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Canvas updated (${updates.length} node(s)):\n${summary}`,
            },
          ],
        };
      }

      case "temporal_scan_workflows": {
        const cwd = process.cwd();
        const workflows = scanWorkflows(cwd);

        if (workflows.length === 0) {
          return {
            content: [
              { type: "text", text: "No workflow files found in the project." },
            ],
          };
        }

        const summary = workflows
          .map((w) => {
            const parts = [
              `## ${w.name}`,
              `- **Service:** ${w.service}`,
              `- **File:** ${w.filePath}`,
            ];
            if (w.stateType) parts.push(`- **State:** ${w.stateType}`);
            if (w.activities.length > 0) {
              parts.push(
                `- **Activities:** ${w.activities
                  .map((a) => {
                    const detail = [a.name];
                    if (a.timeout) detail.push(`timeout: ${a.timeout}`);
                    if (a.maxAttempts) detail.push(`retries: ${a.maxAttempts}`);
                    return detail.join(" (") + (detail.length > 1 ? ")" : "");
                  })
                  .join(", ")}`,
              );
            }
            if (w.signals.length > 0)
              parts.push(`- **Signals:** ${w.signals.join(", ")}`);
            if (w.queries.length > 0)
              parts.push(`- **Queries:** ${w.queries.join(", ")}`);
            if (w.updates.length > 0)
              parts.push(`- **Updates:** ${w.updates.join(", ")}`);
            if (w.childWorkflows.length > 0)
              parts.push(
                `- **Child Workflows:** ${w.childWorkflows.join(", ")}`,
              );
            if (w.conditions.length > 0) {
              parts.push(
                `- **Conditions:** ${w.conditions.map((c) => `\`${c.expression}\`${c.timeout ? ` (${c.timeout})` : ""}`).join(", ")}`,
              );
            }
            return parts.join("\n");
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `# Temporal Workflows (${workflows.length} found)\n\n${summary}`,
            },
          ],
        };
      }

      case "temporal_scan_activities": {
        const cwd = process.cwd();
        const scanned = scanActivities(cwd);
        const workflows = scanWorkflows(cwd);
        const enriched = mergeActivityData(scanned, workflows);

        if (enriched.length === 0) {
          return {
            content: [
              { type: "text", text: "No activity files found in the project." },
            ],
          };
        }

        // Group by service
        const byService = new Map<string, typeof enriched>();
        for (const act of enriched) {
          const list = byService.get(act.service) || [];
          list.push(act);
          byService.set(act.service, list);
        }

        const summary = Array.from(byService.entries())
          .map(([svc, acts]) => {
            const actLines = acts
              .map((a) => {
                const paramStr = a.params
                  .map((p) => `${p.name}: ${p.type}`)
                  .join(", ");
                const configParts: string[] = [];
                if (a.config?.timeout)
                  configParts.push(`timeout: ${a.config.timeout}`);
                if (a.config?.maxAttempts)
                  configParts.push(`retries: ${a.config.maxAttempts}`);
                const configStr =
                  configParts.length > 0 ? ` [${configParts.join(", ")}]` : "";
                return `  - \`${a.name}(${paramStr})\`: ${a.returnType}${configStr}\n    File: ${a.filePath}`;
              })
              .join("\n");
            return `### ${svc}\n${actLines}`;
          })
          .join("\n\n");

        return {
          content: [
            {
              type: "text",
              text: `# Temporal Activities (${enriched.length} found)\n\n${summary}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// ── Start ─────────────────────────────────────────────────────────

export async function startServer(
  config: Partial<ServerConfig> = {},
): Promise<void> {
  const { httpPort = DEFAULT_HTTP_PORT, verbose = false } = config;

  await createHttpServer(httpPort, verbose);

  const mcpServer = createMcpServer(verbose);
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);

  console.error("[temporal-playground] MCP server connected via stdio");
}

export { broadcastEvent };
