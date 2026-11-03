import type { Node } from "@xyflow/react";
import type {
  ActiveSource,
  ActivityNodeData,
  ChildWorkflowNodeData,
  ConditionNodeData,
  EndNodeData,
  QueryNodeData,
  SignalNodeData,
  SleepNodeData,
  StartNodeData,
  UpdateNodeData,
  WorkflowSpec,
} from "../types";

interface CollectedNodes {
  start: StartNodeData[];
  activities: ActivityNodeData[];
  signals: SignalNodeData[];
  queries: QueryNodeData[];
  updates: UpdateNodeData[];
  children: ChildWorkflowNodeData[];
  conditions: ConditionNodeData[];
  sleeps: SleepNodeData[];
  ends: EndNodeData[];
}

export function collectNodes(nodes: Node[]): CollectedNodes {
  const r: CollectedNodes = {
    start: [],
    activities: [],
    signals: [],
    queries: [],
    updates: [],
    children: [],
    conditions: [],
    sleeps: [],
    ends: [],
  };
  for (const n of nodes) {
    const d = n.data as Record<string, unknown>;
    switch (n.type) {
      case "start":
        r.start.push(d as StartNodeData);
        break;
      case "activity":
        r.activities.push(d as ActivityNodeData);
        break;
      case "signal":
        r.signals.push(d as SignalNodeData);
        break;
      case "query":
        r.queries.push(d as QueryNodeData);
        break;
      case "update":
        r.updates.push(d as UpdateNodeData);
        break;
      case "childWorkflow":
        r.children.push(d as ChildWorkflowNodeData);
        break;
      case "condition":
        r.conditions.push(d as ConditionNodeData);
        break;
      case "sleep":
        r.sleeps.push(d as SleepNodeData);
        break;
      case "end":
        r.ends.push(d as EndNodeData);
        break;
    }
  }
  return r;
}

export function generateNL(
  nodes: Node[],
  activeSource: ActiveSource | null,
): string {
  const c = collectNodes(nodes);
  const s = c.start[0] ?? { workflowName: "unnamed", params: [] };
  const parts: string[] = [];

  if (activeSource?.type === "existing") {
    parts.push(
      `Modify the existing Temporal workflow "${s.workflowName}" in ProjectX.`,
    );
    parts.push(
      `Source file: ${activeSource.path}`,
      `Service: ${activeSource.service}`,
    );
  } else {
    parts.push(
      `Create a new Temporal workflow called "${s.workflowName}" for ProjectX.`,
    );
  }

  // Format params
  const paramStr = Array.isArray(s.params)
    ? s.params
        .map(
          (p: {
            name: string;
            type?: string;
            required: boolean;
            defaultValue?: string;
          }) =>
            `${p.name}: ${p.type || "unknown"}${p.required ? " (required)" : ""}${p.defaultValue ? ` = ${p.defaultValue}` : ""}`,
        )
        .join(", ")
    : String(s.params || "");
  if (paramStr) parts.push(`Parameters: ${paramStr}`);

  if (
    c.activities.length ||
    c.children.length ||
    c.conditions.length ||
    c.sleeps.length
  ) {
    parts.push("\nExecution Steps:");
    let step = 1;
    for (const a of c.activities)
      parts.push(
        `  ${step++}. Activity: ${a.activityName} (timeout: ${a.timeout}, retry: ${a.maxAttempts} attempts)`,
      );
    for (const ch of c.children)
      parts.push(
        `  ${step++}. Child Workflow: ${ch.workflowName} (id: ${ch.workflowId})`,
      );
    for (const co of c.conditions)
      parts.push(`  ${step++}. Wait: ${co.condition} (timeout: ${co.timeout})`);
    for (const sl of c.sleeps) parts.push(`  ${step++}. Sleep: ${sl.duration}`);
  }
  if (c.signals.length) {
    parts.push("\nSignal Handlers:");
    for (const sg of c.signals)
      parts.push(
        `  - ${sg.signalName}(${sg.params}) \u2192 updates: ${sg.stateUpdates}`,
      );
  }
  if (c.queries.length) {
    parts.push("\nQuery Handlers:");
    for (const q of c.queries)
      parts.push(`  - ${q.queryName}() \u2192 ${q.returnType}`);
  }
  if (c.updates.length) {
    parts.push("\nUpdate Handlers:");
    for (const u of c.updates)
      parts.push(
        `  - ${u.updateName}(${u.params})${u.async ? " (async)" : ""}`,
      );
  }
  if (c.ends.length) parts.push(`\nReturn Value: ${c.ends[0]?.returnValue}`);

  parts.push(
    "\nImplementation Notes:",
    "  - Import signal/query/update definitions from @projectx/core/workflows",
    "  - Use proxyActivities<ActivitiesService> for activity proxying",
    "  - Use setHandler() for queries, signals, and updates at workflow start",
    "  - Use condition(allHandlersFinished) before workflow completion",
  );
  if (activeSource?.type === "existing") {
    parts.push(
      `  - Modify the existing file: ${activeSource.path}`,
      "  - Preserve existing behavior unless explicitly changed in the spec above",
    );
  } else {
    parts.push(
      "  - Follow patterns in apps/order/src/workflows/order.workflow.ts",
      "  - Use `pnpm cli generate workflow` to scaffold, then customize",
      "  - Add signal/query/update definitions to @projectx/core",
    );
  }
  return parts.join("\n");
}

export function generateJSON(
  nodes: Node[],
  activeSource: ActiveSource | null,
): WorkflowSpec {
  const c = collectNodes(nodes);
  const s = c.start[0] ?? { workflowName: "unnamed", params: [] };

  const paramStr = Array.isArray(s.params)
    ? s.params
        .map(
          (p: {
            name: string;
            type?: string;
            required: boolean;
            defaultValue?: string;
          }) =>
            `${p.name}: ${p.type || "unknown"}${p.required ? " (required)" : ""}${p.defaultValue ? ` = ${p.defaultValue}` : ""}`,
        )
        .join(", ")
    : String(s.params || "");

  const spec: WorkflowSpec = {
    workflowName: s.workflowName,
    params: paramStr,
    mode: activeSource?.type === "existing" ? "modify" : "create",
    source:
      activeSource?.type === "existing"
        ? {
            path: activeSource.path ?? "",
            utilsPath: "",
            service: activeSource.service ?? "",
          }
        : null,
    steps: [
      ...c.activities.map((a) => ({
        type: "activity" as const,
        name: a.activityName,
        timeout: a.timeout,
        retryPolicy: { maxAttempts: a.maxAttempts },
      })),
      ...c.children.map((ch) => ({
        type: "childWorkflow" as const,
        name: ch.workflowName,
        workflowId: ch.workflowId,
        args: ch.args,
      })),
      ...c.conditions.map((co) => ({
        type: "condition" as const,
        waitFor: co.condition,
        timeout: co.timeout,
      })),
      ...c.sleeps.map((sl) => ({
        type: "sleep" as const,
        duration: sl.duration,
      })),
    ],
    signals: c.signals.map((sg) => ({
      name: sg.signalName,
      params: sg.params,
      stateUpdates: sg.stateUpdates,
    })),
    queries: c.queries.map((q) => ({
      name: q.queryName,
      returnType: q.returnType,
    })),
    updates: c.updates.map((u) => ({
      name: u.updateName,
      params: u.params,
      async: u.async,
    })),
  };
  if (c.ends.length) spec.returnValue = c.ends[0]?.returnValue;
  return spec;
}
