export type {
  ActivityInfo,
  ConditionInfo,
  WorkflowMetadata,
  WorkflowParamInfo,
} from "../../../shared/types";

export interface ActiveSource {
  type: "existing" | "preset";
  key: string;
  path?: string;
  service?: string;
}
