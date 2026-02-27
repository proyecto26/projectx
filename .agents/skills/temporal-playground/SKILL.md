---
name: temporal-playground
description: Interactive visual playground for designing, editing, and generating Temporal workflows. Use when the user wants to visually build workflows, load existing project workflows onto a canvas, or generate workflow code from a visual spec. Includes its own MCP server (temporal-playground) for chat and connects to temporal-docs MCP for documentation.
allowed-tools: Read, Grep, Glob, Edit, Write, Bash, WebFetch, temporal_watch, temporal_get_prompt, temporal_clear, temporal_list_pending, temporal_scan_workflows, temporal_respond, temporal_update_canvas
---

# Temporal Workflow Playground

A visual, node-based workflow designer that lets users build Temporal workflows by dragging nodes and connecting them on a LiteGraph.js canvas, then send structured specs to Claude for implementation. Integrates with the project's existing workflows and the Temporal MCP documentation server.

## When to use this skill

- User wants to **visually design** a Temporal workflow (drag nodes, connect flow)
- User wants to **inspect or modify** an existing workflow from the monorepo
- User wants to **generate workflow code** from a visual spec
- User asks to "build a workflow", "design a workflow", or "open the workflow builder"
- User wants to explore Temporal patterns interactively

## How to use this skill

### 1. Scan existing workflows

Call the `temporal_scan_workflows` MCP tool to scan the monorepo for workflow files. This returns structured metadata for each workflow including name, service, file path, signals, queries, updates, activities (with timeout/retry config), child workflows, and conditions.

### 2. Load the matching template

Select from `templates/`:
- `templates/workflow-builder.md` — Node-based visual workflow designer with LiteGraph.js canvas

### 3. Build or update the playground HTML

The playground is a single HTML file at `.agents/skills/temporal-playground/public/index.html`, served at `http://localhost:4343/` when the server is running. When updating:

- **Existing workflows**: Parse the actual TypeScript files and generate the `EXISTING_WORKFLOWS` JavaScript object with accurate `build()` functions that create the correct LiteGraph nodes with real property values
- **New templates**: If the user asks for a new workflow pattern, add it to the `PRESETS` object
- **Node types**: The 10 custom node types (Start, State, Activity, Signal, Query, Update, Child Workflow, Condition/Wait, Sleep, End) cover all Temporal primitives

### 4. Start the server and watch for prompts

Start the playground server (serves both the UI and MCP tools):
```bash
pnpm playground
```

Then open `http://localhost:4343/` in a browser. After opening, call the `temporal_watch` MCP tool to wait for prompts. When a prompt arrives, check the `[CHAT]` or `[APPLY CHANGES]` label:

#### Send button → `[CHAT]` — Draft changes only
The user is discussing or requesting visual draft changes on the canvas. **DO NOT modify any code files.**

1. **Respond in chat** — call `temporal_respond` to acknowledge or ask clarifying questions
2. **Update the canvas** — call `temporal_update_canvas` to modify node properties visually. Example:
   ```json
   { "updates": [{ "nodeType": "workflow/Activity", "match": { "activityName": "reportPaymentConfirmed" }, "set": { "maxAttempts": 10 } }] }
   ```
3. **Confirm** — call `temporal_respond` to summarize what was changed on the canvas
4. **Call `temporal_clear`** and then `temporal_watch` again for the next prompt

#### Apply Changes button → `[APPLY CHANGES]` — Modify code files
The user wants to apply the current canvas state to actual code files.

1. **Read the spec** — it contains the full workflow structure
2. **Respond in chat** — call `temporal_respond` to confirm what will be changed
3. **Use the temporal-docs MCP** — query Temporal documentation for best practices
4. **Implement** — for new workflows use `pnpm cli generate workflow`, for existing ones edit the source file directly
5. **Respond with summary** — call `temporal_respond` to confirm what was done
6. **Call `temporal_clear`** and then `temporal_watch` again for the next prompt

### 5. Leverage Temporal MCP documentation

The `temporal-docs` MCP server (`https://temporal.mcp.kapa.ai`) provides real-time Temporal documentation. Use it when:

- Generating code from a visual spec (query for current API patterns)
- The user asks about a specific Temporal feature in chat
- Validating workflow patterns (determinism rules, versioning, etc.)
- Looking up retry policies, timeouts, or error handling best practices

## Workflow file parsing strategy

To populate existing workflows on the canvas, parse TypeScript workflow files using these patterns:

```typescript
// Workflow function → Start node
export async function createOrder(data: OrderWorkflowData) { ... }
// → workflowName: 'createOrder', params: 'data: OrderWorkflowData'

// Activity proxy → Activity nodes
const { createOrder, reportPaymentFailed } = proxyActivities<ActivitiesService>({
  startToCloseTimeout: '5 seconds',
  retry: { maximumAttempts: 10, backoffCoefficient: 1.5 }
});
// → activityName: 'createOrder', timeout: '5 seconds', maxAttempts: 10

// Signal handler → Signal node
setHandler(paymentWebHookEventSignal, (event: PaymentWebhookEvent) => { ... });
// → signalName: from imported definition, params: 'event: PaymentWebhookEvent'

// Query handler → Query node
setHandler(getOrderStateQuery, () => state);
// → queryName: from imported definition, returnType: from state type

// Update handler → Update node
setHandler(createOrderUpdate, async () => { ... });
// → updateName: from imported definition

// Child workflow → ChildWorkflow node
const child = await startChild(processPayment, { args: [data], workflowId: '...' });
// → workflowName: 'processPayment', workflowId: pattern, args: 'data'

// Condition wait → Condition node
await condition(() => !!state?.orderId, ORDER_TIMEOUT);
// → condition: '!!state?.orderId', timeout: ORDER_TIMEOUT value

// Sleep → Sleep node
await sleep('1 hour');
// → duration: '1 hour'
```

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
  - paymentWebhookEvent(event: PaymentWebhookEvent) → updates: status

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

## Claude Sync transport

The playground includes a chat panel and spec output bar that post to `localhost:4343` via the temporal-playground MCP server. The SSE connection provides real-time status updates.

## Common mistakes to avoid

- Setting LiteGraph widget values via `widgets_values` array alone — must set `node.widgets[i].value` directly
- Hardcoding workflow structures that drift from actual source files — always parse fresh when possible
- Generating code without checking Temporal docs MCP for current API patterns
- Creating a new workflow file when the user loaded an existing one (check `mode` field)
- Missing `allHandlersFinished` condition before workflow completion
- Non-deterministic operations inside workflow functions
