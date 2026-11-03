import type { EdgeTypes } from "@xyflow/react";
import { DataEdge } from "./DataEdge";
import { FlowEdge } from "./FlowEdge";
import { WorkflowEdge } from "./WorkflowEdge";

export const edgeTypes: EdgeTypes = {
  flow: FlowEdge,
  data: DataEdge,
  workflow: WorkflowEdge,
};
