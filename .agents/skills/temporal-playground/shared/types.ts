export interface ActivityInfo {
  name: string;
  timeout?: string;
  maxAttempts?: number;
  backoffCoefficient?: number;
}

export interface ConditionInfo {
  expression: string;
  timeout?: string;
}

export interface WorkflowParamInfo {
  name: string;
  type: string;
  /** Resolved fields when the type is a known object/type alias */
  fields?: { name: string; type: string }[];
  hasDefault?: boolean;
}

export interface WorkflowMetadata {
  name: string;
  service: string;
  filePath: string;
  signals: string[];
  queries: string[];
  updates: string[];
  activities: ActivityInfo[];
  childWorkflows: string[];
  conditions: ConditionInfo[];
  stateType?: string;
  /** State initialization code body extracted from `const state: Type = { ... }` */
  stateInit?: string;
  /** Workflow function parameters extracted from the export signature */
  params: WorkflowParamInfo[];
}

export interface ActivityParam {
  name: string;
  type: string;
}

export interface DiscoveredActivity {
  name: string;
  service: string;
  filePath: string;
  params: ActivityParam[];
  returnType: string;
  /** Retry/timeout config from proxyActivities in workflow files */
  config?: {
    timeout?: string;
    maxAttempts?: number;
    backoffCoefficient?: number;
  };
}
