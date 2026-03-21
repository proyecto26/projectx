import type { Node } from "@xyflow/react";

/** A single workflow input parameter (positional arg) */
export interface WorkflowParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue: string;
}

export interface StartNodeData {
  workflowName: string;
  params: WorkflowParam[];
  [key: string]: unknown;
}

export interface ActivityNodeData {
  activityName: string;
  timeout: string;
  maxAttempts: number;
  [key: string]: unknown;
}

export interface SignalNodeData {
  signalName: string;
  params: string;
  stateUpdates: string;
  [key: string]: unknown;
}

export interface QueryNodeData {
  queryName: string;
  returnType: string;
  [key: string]: unknown;
}

export interface UpdateNodeData {
  updateName: string;
  params: string;
  async: boolean;
  [key: string]: unknown;
}

export interface ChildWorkflowNodeData {
  workflowName: string;
  workflowId: string;
  args: string;
  [key: string]: unknown;
}

export interface ConditionNodeData {
  condition: string;
  timeout: string;
  [key: string]: unknown;
}

export interface SleepNodeData {
  duration: string;
  [key: string]: unknown;
}

export interface EndNodeData {
  returnValue: string;
  [key: string]: unknown;
}

export interface TextPromptNodeData {
  prompt: string;
  [key: string]: unknown;
}

export interface AIGenerationNodeData {
  result: string;
  [key: string]: unknown;
}

export interface CustomCodeNodeData {
  label: string;
  code: string;
  outputVar: string;
  [key: string]: unknown;
}

export interface VariableChangeNodeData {
  label: string;
  variable: string;
  value: string;
  [key: string]: unknown;
}

export interface ApiCallNodeData {
  label: string;
  url: string;
  method: string;
  headers: string;
  body: string;
  outputVar: string;
  [key: string]: unknown;
}

export interface LoopNodeData {
  label: string;
  loopType: "count" | "collection";
  countOrCollection: string;
  itemVar: string;
  outputVar: string;
  [key: string]: unknown;
}

export type WorkflowNodeData =
  | StartNodeData
  | ActivityNodeData
  | SignalNodeData
  | QueryNodeData
  | UpdateNodeData
  | ChildWorkflowNodeData
  | ConditionNodeData
  | SleepNodeData
  | EndNodeData
  | TextPromptNodeData
  | AIGenerationNodeData
  | CustomCodeNodeData
  | VariableChangeNodeData
  | ApiCallNodeData
  | LoopNodeData;

export type WorkflowNodeType =
  | "start"
  | "activity"
  | "signal"
  | "query"
  | "update"
  | "childWorkflow"
  | "condition"
  | "sleep"
  | "end"
  | "textPrompt"
  | "aiGeneration"
  | "customCode"
  | "variableChange"
  | "apiCall"
  | "loop";

export type WorkflowNode = Node<WorkflowNodeData, WorkflowNodeType>;
