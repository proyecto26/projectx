---
name: temporal-playground
description: Interactive visual playground for designing, editing, and generating Temporal workflows. Use when the user wants to visually build workflows, load existing project workflows onto a canvas, or generate workflow code from a visual spec. Includes its own MCP server (temporal-playground) for chat and connects to temporal-docs MCP for documentation.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch, temporal_watch, temporal_get_prompt, temporal_clear, temporal_list_pending, temporal_scan_workflows, temporal_respond, temporal_update_canvas
---

# Temporal Workflow Playground

A visual, node-based workflow designer built with React 19, React Flow 12, and Zustand. Users design Temporal workflows by dragging nodes, connecting them on a canvas, then send structured specs to Claude for implementation. Integrates with the project's existing workflows via dynamic scanning and the Temporal MCP documentation server.

## Architecture

```
.agents/skills/temporal-playground/
  server/          # MCP server (Node.js HTTP + stdio), serves ../public/
  ui/              # Vite + React app (TypeScript, Tailwind v4)
    src/
      components/  # canvas/, chat/, palette/, spec/, layout/
      constants/   # node-types, node-defaults, handle-colors, presets
      edges/       # FlowEdge, DataEdge, WorkflowEdge
      hooks/       # useSSE, useChat, useSpec, useDragAndDrop, useWorkflowScanner
      lib/         # api, spec-generator, workflow-parser
      nodes/       # BaseNode, 10 node types (Start..End)
      store/       # workflow-store, chat-store, ui-store (Zustand)
      styles/      # Tailwind v4 + React Flow dark theme
      types/       # nodes, edges, workflow, chat, spec
  public/          # Vite build output (served by MCP server)
```

**Scripts:**
- `pnpm playground:dev` -- starts Vite dev server (:4344) with hot reload (proxies API to :4343)
- `pnpm playground` -- production mode, serves built UI from `public/` on :4343 (standalone, no Claude Code)
- `pnpm playground:build` -- builds both server and UI for production

**Important:** Claude Code auto-starts the MCP server (HTTP :4343 + stdio) via `.mcp.json`. The `playground:dev` script only starts Vite — it does NOT start the API server, since Claude Code already manages it. The Vite proxy forwards `/events`, `/prompt`, `/respond`, `/api/*` to :4343.

## When to use this skill

- User wants to **visually design** a Temporal workflow (drag nodes, connect flow)
- User wants to **inspect or modify** an existing workflow from the monorepo
- User wants to **generate workflow code** from a visual spec
- User asks to "build a workflow", "design a workflow", or "open the workflow builder"
- User wants to explore Temporal patterns interactively

## How to use this skill

### 1. Scan existing workflows

Call the `temporal_scan_workflows` MCP tool to scan the monorepo for workflow files. This returns structured metadata for each workflow including name, service, file path, signals, queries, updates, activities (with timeout/retry config), child workflows, and conditions.

The UI also auto-discovers workflows on mount via `GET /api/workflows` (backed by the same `scanWorkflows()` function).

### 2. Start the UI and watch for prompts

The MCP server starts automatically when Claude Code launches (configured in `.mcp.json`). You only need to start the Vite UI:

```bash
pnpm playground:dev   # Vite dev server with hot reload at http://localhost:4344/
```

For standalone/production mode (no Claude Code, serves built UI directly):
```bash
pnpm playground       # API + static UI at http://localhost:4343/
```

After the UI is open, call the `temporal_watch` MCP tool to wait for prompts. When a prompt arrives, check the `[CHAT]` or `[APPLY CHANGES]` label:

#### Send button -> `[CHAT]` -- Draft changes only
The user is discussing or requesting visual draft changes on the canvas. **DO NOT modify any code files.**

1. **Respond in chat** -- call `temporal_respond` to acknowledge or ask clarifying questions
2. **Update the canvas** -- call `temporal_update_canvas` to modify node properties visually. Example:
   ```json
   { "updates": [{ "nodeType": "activity", "match": { "activityName": "reportPaymentConfirmed" }, "set": { "maxAttempts": 10 } }] }
   ```
3. **Confirm** -- call `temporal_respond` to summarize what was changed on the canvas
4. **Call `temporal_clear`** and then `temporal_watch` again for the next prompt

#### Apply Changes button -> `[APPLY CHANGES]` -- Modify code files
The user wants to apply the current canvas state to actual code files.

1. **Read the spec** -- it contains the full workflow structure
2. **Respond in chat** -- call `temporal_respond` to confirm what will be changed
3. **Use the temporal-docs MCP** -- query Temporal documentation for best practices
4. **Implement** -- for new workflows use `pnpm cli generate workflow`, for existing ones edit the source file directly
5. **Respond with summary** -- call `temporal_respond` to confirm what was done
6. **Call `temporal_clear`** and then `temporal_watch` again for the next prompt

### 3. Leverage Temporal MCP documentation

The `temporal-docs` MCP server (`https://temporal.mcp.kapa.ai`) provides real-time Temporal documentation. Use it when:

- Generating code from a visual spec (query for current API patterns)
- The user asks about a specific Temporal feature in chat
- Validating workflow patterns (determinism rules, versioning, etc.)
- Looking up retry policies, timeouts, or error handling best practices

## Dynamic workflow discovery

The UI fetches `GET /api/workflows` on mount to populate the "Existing Workflows" sidebar. Workflows are grouped by service (order, auth, product) and clicking one converts the `WorkflowMetadata` into React Flow nodes/edges via `workflow-parser.ts`.

## Spec generation

The playground generates two output formats:

### Natural Language (for Claude)
```
Create a new Temporal workflow called "myWorkflow" for ProjectX.
Task Queue: "order"
Parameters: data: OrderWorkflowData

Execution Steps:
  1. Activity: createOrder (timeout: 5s, retry: 10 attempts)
  2. Child Workflow: processPayment (id: payment-{referenceId})
  3. Wait: status === 'confirmed' (timeout: 15m)

Signal Handlers:
  - paymentWebhookEvent(event: PaymentWebhookEvent) -> updates: status

Implementation Notes:
  - Import definitions from @projectx/core/workflows
  - Use proxyActivities<ActivitiesService>
  - Follow patterns in apps/order/src/workflows/order.workflow.ts
```

### JSON (structured)
```json
{
  "workflowName": "myWorkflow",
  "mode": "create",
  "source": null,
  "taskQueue": "order",
  "steps": [...],
  "signals": [...],
  "queries": [...],
  "updates": [...]
}
```

When `mode` is `"modify"`, `source` contains `{ path, utilsPath, service }` pointing to the existing files.

## Building

```bash
# Install UI deps (use npm, not pnpm -- isolated from monorepo)
cd .agents/skills/temporal-playground/ui && npm install

# Build everything (server + UI) for production
pnpm playground:build
```

## Common mistakes to avoid

- Hardcoding workflow structures that drift from actual source files -- the UI now auto-scans
- Generating code without checking Temporal docs MCP for current API patterns
- Creating a new workflow file when the user loaded an existing one (check `mode` field)
- Missing `allHandlersFinished` condition before workflow completion
- Non-deterministic operations inside workflow functions
