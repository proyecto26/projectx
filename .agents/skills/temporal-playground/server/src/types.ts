export type {
  ActivityInfo,
  ConditionInfo,
  WorkflowMetadata,
  WorkflowParamInfo,
} from "../../shared/types.js";

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
