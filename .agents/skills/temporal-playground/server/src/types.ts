export type PromptType = "chat" | "apply";

export interface PlaygroundPrompt {
  id: string;
  prompt: string;
  type: PromptType;
  url: string;
  pathname: string;
  timestamp: number;
}

export interface ServerConfig {
  httpPort: number;
  verbose: boolean;
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
}

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
