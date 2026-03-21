import type { Edge, Node } from "@xyflow/react";
import type { WorkflowMetadata } from "../types";
import type { WorkflowParam } from "../types/nodes";

/**
 * Convert scanned WorkflowParamInfo[] into the UI's WorkflowParam[] format.
 * Each function arg becomes ONE positional entry — we preserve the raw
 * param name and type (e.g. "data: LoginWorkflowData") instead of expanding fields.
 */
function convertParams(wf: WorkflowMetadata): WorkflowParam[] {
  return (wf.params ?? []).map((p) => ({
    name: p.name,
    type: p.type ?? "unknown",
    required: !p.hasDefault,
    description: "",
    defaultValue: "",
  }));
}

/**
 * Convert WorkflowMetadata (from scanner) to React Flow nodes/edges
 * with auto-positioned layout.
 */
export function workflowToGraph(wf: WorkflowMetadata): {
  nodes: Node[];
  edges: Edge[];
} {
  const prefix = wf.name.slice(0, 3);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let edgeIdx = 0;
  const addEdge = (
    src: string,
    srcH: string,
    tgt: string,
    tgtH: string,
    type: string,
  ) => {
    edges.push({
      id: `${prefix}-e${edgeIdx++}`,
      source: src,
      sourceHandle: srcH,
      target: tgt,
      targetHandle: tgtH,
      type,
    });
  };

  // Start node — populate params from scanned workflow function signature
  const startId = `${prefix}-start`;
  const params = convertParams(wf);
  if (import.meta.env.DEV) {
    console.log(
      `[workflow-parser] ${wf.name}: server params=`,
      wf.params,
      "→ converted=",
      params,
    );
  }
  nodes.push({
    id: startId,
    type: "start",
    position: { x: 50, y: 50 },
    data: { workflowName: wf.name, params },
  });

  // State initialization — add Custom Code block if state init pattern was found
  let prevFlowId = startId;
  if (wf.stateType && wf.stateInit) {
    const stateInitId = `${prefix}-stateInit`;
    nodes.push({
      id: stateInitId,
      type: "customCode",
      position: { x: 50, y: 200 },
      data: {
        label: `Init ${wf.stateType}`,
        code: `return ${wf.stateInit};`,
        outputVar: "state",
      },
    });
    addEdge(startId, "flow-out", stateInitId, "flow-in", "flow");
    prevFlowId = stateInitId;
  }

  // Activities
  const flowX = 380;
  let flowY = 50;
  for (const act of wf.activities) {
    const id = `${prefix}-act-${act.name}`;
    nodes.push({
      id,
      type: "activity",
      position: { x: flowX, y: flowY },
      data: {
        activityName: act.name,
        timeout: act.timeout ?? "5 seconds",
        maxAttempts: act.maxAttempts ?? 10,
      },
    });
    addEdge(prevFlowId, "flow-out", id, "flow-in", "flow");
    prevFlowId = id;
    flowY += 180;
  }

  // Child workflows
  for (const child of wf.childWorkflows) {
    const id = `${prefix}-child-${child}`;
    nodes.push({
      id,
      type: "childWorkflow",
      position: { x: flowX, y: flowY },
      data: { workflowName: child, workflowId: `${child}-{id}`, args: "data" },
    });
    addEdge(prevFlowId, "flow-out", id, "flow-in", "flow");
    prevFlowId = id;
    flowY += 180;
  }

  // Conditions
  const condX = 700;
  let condY = 50;
  for (const cond of wf.conditions) {
    const id = `${prefix}-cond-${condY}`;
    nodes.push({
      id,
      type: "condition",
      position: { x: condX, y: condY },
      data: {
        condition: cond.expression,
        timeout: cond.timeout ?? "15 minutes",
      },
    });
    addEdge(prevFlowId, "flow-out", id, "flow-in", "flow");
    prevFlowId = id;
    condY += 180;
  }

  // End node
  const endId = `${prefix}-end`;
  nodes.push({
    id: endId,
    type: "end",
    position: { x: condX, y: condY },
    data: { returnValue: "state" },
  });
  addEdge(prevFlowId, "flow-out", endId, "flow-in", "flow");

  // Workflow-level handlers (signals, queries, updates)
  let handlerY = 400;
  const handlerX = 50;

  for (const sig of wf.signals) {
    const id = `${prefix}-sig-${sig}`;
    nodes.push({
      id,
      type: "signal",
      position: { x: handlerX, y: handlerY },
      data: {
        signalName: sig,
        params: "event: unknown",
        stateUpdates: "(scanned)",
      },
    });
    addEdge(startId, "flow-out", id, "wf-in", "workflow");
    handlerY += 170;
  }

  for (const q of wf.queries) {
    const id = `${prefix}-q-${q}`;
    nodes.push({
      id,
      type: "query",
      position: { x: handlerX + 330, y: handlerY },
      data: { queryName: q, returnType: wf.stateType ?? "unknown" },
    });
    addEdge(startId, "flow-out", id, "wf-in", "workflow");
    handlerY += 170;
  }

  for (const u of wf.updates) {
    const id = `${prefix}-upd-${u}`;
    nodes.push({
      id,
      type: "update",
      position: { x: handlerX + 330, y: handlerY },
      data: { updateName: u, params: "data: unknown", async: false },
    });
    addEdge(startId, "flow-out", id, "wf-in", "workflow");
    handlerY += 170;
  }

  return { nodes, edges };
}
