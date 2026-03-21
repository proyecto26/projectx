import type { Edge } from "@xyflow/react";

export type WorkflowEdgeType = "flow" | "data" | "workflow";

export type WorkflowEdge = Edge & {
  type: WorkflowEdgeType;
};
