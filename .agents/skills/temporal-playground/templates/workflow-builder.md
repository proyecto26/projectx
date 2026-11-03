# Workflow Builder Template

Use this template when the playground is about designing Temporal workflows visually: dragging node types onto a canvas, connecting them to define execution flow, configuring properties, and generating structured specs for implementation.

## Layout

```
+------------+---------------------------+----------+
|            |                           |          |
| + New WF   |  LiteGraph Canvas         |  Chat:   |
|            |  (drag/drop nodes,        |  Messages|
| Existing:  |   connect them)           |  Input   |
| • createOrd|                           |  [Send]  |
| • processPa|                           |  [Gen]   |
| • loginUser|                           |          |
|            |                           |          |
| Node Types |                           |          |
| • Start    |                           |          |
| • Activity |                           |          |
| • Signal.. |                           |          |
|            |                           |          |
| Templates: |                           |          |
| • Payment  |                           |          |
| • Login... |                           |          |
+------------+---------------------------+----------+
| Spec Output:  [JSON + NL]  [Copy] [Send to Claude]|
+----------------------------------------------------+
```

The left palette has 4 sections: New Workflow button, Existing Workflows (scanned from monorepo), Node Types (draggable), and Templates (preset patterns). The right chat panel connects to the temporal-playground MCP server. The bottom bar shows the generated spec.

## Existing Workflows section

Scan the monorepo for workflow files and display them with metadata:

```
┌─────────────────────────────────────┐
│ createOrder              ORDER      │
│ apps/order/src/workflows/order...   │
│ ⚡2  🔍1  ✏️1  🔗1                  │
├─────────────────────────────────────┤
│ processPayment           ORDER      │
│ apps/order/src/workflows/process... │
│ ⚡2                                 │
├─────────────────────────────────────┤
│ loginUserWorkflow        AUTH       │
│ apps/auth/src/workflows/login...    │
│ 🔍1  ✏️1                            │
└─────────────────────────────────────┘
```

Each item shows: workflow name, service badge (color-coded), source file path, and counts for signals/queries/updates/children.

Clicking an existing workflow loads it onto the canvas with all its real nodes, properties, and connections. The spec output switches to "Modify" mode referencing the source file.

## Node types

10 custom LiteGraph node types representing Temporal workflow primitives:

| Node | Color | Inputs | Outputs | Properties |
|---|---|---|---|---|
| Start | blue | — | flow | workflowName, taskQueue, params |
| State | teal | — | data | interfaceName, fields |
| Activity | green | flow | flow, result | activityName, timeout, maxAttempts, backoffCoefficient |
| Signal | orange | workflow | triggered | signalName, params, stateUpdates |
| Query | purple | workflow | — | queryName, returnType |
| Update | cyan | workflow | completed | updateName, params, returnType, async |
| Child Workflow | red | flow | flow, result | workflowName, workflowId, args, taskQueue |
| Condition/Wait | yellow | flow | success, timeout | condition, timeout |
| Sleep | gray | flow | flow | duration |
| End | dark-red | flow | — | returnValue |

**Important**: Set widget values using `node.widgets[i].value = '...'` directly, NOT via the `widgets_values` array which only works during deserialization.

## Template presets

5 templates based on real project patterns:

1. **Payment Processing** — Activity → Signal → Condition (from `process-payment.workflow.ts`)
2. **Human-in-the-Loop Login** — Activity → Update → Condition (from `login.workflow.ts`)
3. **Parent + Child** — Parent spawns child workflow (from `order.workflow.ts`)
4. **Signal-Driven State Machine** — Multiple signal handlers managing state transitions
5. **Long-Running + ContinueAsNew** — Loop with Sleep and periodic checkpointing

## Spec generation

### Create mode (new workflow)
```
Create a new Temporal workflow called "myWorkflow" for ProjectX.
Task Queue: "order"
...
Implementation Notes:
  - Use `pnpm cli generate workflow` to scaffold, then customize
  - Add signal/query/update definitions to @projectx/core
```

### Modify mode (existing workflow)
```
Modify the existing Temporal workflow "createOrder" in ProjectX.
Source file: apps/order/src/workflows/order.workflow.ts
Utils/definitions: packages/core/src/lib/order/workflow.utils.ts
...
Implementation Notes:
  - Modify the existing file: apps/order/src/workflows/order.workflow.ts
  - Preserve existing behavior unless explicitly changed
```

## Temporal MCP integration

When processing prompts from the playground chat, query the `temporal-docs` MCP server for:
- Current API patterns for the workflow primitives being used
- Best practices for signal handling, retry policies, child workflows
- Determinism rules and common pitfalls
- Versioning strategies for modifying running workflows

## Claude Sync

The chat panel and spec output both post to `localhost:4343` via temporal-playground. After opening the playground, use `temporal_watch` to listen for prompts, process them, call `temporal_clear`, then `temporal_watch` again in a loop.
