import type { WorkflowNodeType } from "../types";

/** Common set of flow-connectable target types */
const FLOW_TARGETS: WorkflowNodeType[] = [
  "activity",
  "condition",
  "sleep",
  "childWorkflow",
  "customCode",
  "variableChange",
  "apiCall",
  "loop",
  "end",
];

/** All node types except AI-only types (for AI block connections) */
const ALL_WORKFLOW_TYPES: WorkflowNodeType[] = [
  "start",
  "activity",
  "condition",
  "sleep",
  "childWorkflow",
  "signal",
  "query",
  "update",
  "end",
  "customCode",
  "variableChange",
  "apiCall",
  "loop",
];

/**
 * Connection rules map — defines which node types a source can connect to.
 * Used for isValidConnection and context menu filtering.
 */
export const CONNECTION_RULES: Record<WorkflowNodeType, WorkflowNodeType[]> = {
  start: FLOW_TARGETS,
  activity: FLOW_TARGETS,
  condition: FLOW_TARGETS,
  sleep: FLOW_TARGETS,
  childWorkflow: FLOW_TARGETS,
  customCode: FLOW_TARGETS,
  variableChange: FLOW_TARGETS,
  apiCall: FLOW_TARGETS,
  loop: FLOW_TARGETS,
  update: FLOW_TARGETS,
  signal: [],
  query: [],
  end: [],
  textPrompt: ["aiGeneration", ...ALL_WORKFLOW_TYPES],
  aiGeneration: ["textPrompt", ...ALL_WORKFLOW_TYPES],
};
