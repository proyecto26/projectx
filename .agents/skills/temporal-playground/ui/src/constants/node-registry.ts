import { Position } from "@xyflow/react";
import type { WorkflowNodeType } from "../types";
import { HANDLE_COLORS } from "./handle-colors";

/** Field definition for node detail panel and inline editing */
export interface FieldDef {
  key: string;
  label: string;
  type:
    | "text"
    | "number"
    | "toggle"
    | "textarea"
    | "code"
    | "select"
    | "params-editor";
  placeholder?: string;
  options?: { label: string; value: string }[];
}

/** Handle definition for node connections */
export interface HandleDef {
  type: "source" | "target";
  position: Position;
  id: string;
  style: { background: string };
}

/** Complete node type configuration — single source of truth */
export interface NodeRegistryEntry {
  type: WorkflowNodeType;
  label: string;
  icon: string;
  color: string;
  bgcolor: string;
  desc: string;
  dot: string;
  /** The data key used to derive a summary label (e.g. "activityName") */
  summaryKey: string;
  handles: HandleDef[];
  fields: FieldDef[];
  defaults: Record<string, unknown>;
}

const FLOW_HANDLES = {
  flowIn: {
    type: "target" as const,
    position: Position.Left,
    id: "flow-in",
    style: { background: HANDLE_COLORS.flow },
  },
  flowOut: {
    type: "source" as const,
    position: Position.Right,
    id: "flow-out",
    style: { background: HANDLE_COLORS.flow },
  },
  dataOut: {
    type: "source" as const,
    position: Position.Bottom,
    id: "data-out",
    style: { background: HANDLE_COLORS.data },
  },
  dataIn: {
    type: "target" as const,
    position: Position.Left,
    id: "data-in",
    style: { background: HANDLE_COLORS.data },
  },
  wfAttach: {
    type: "target" as const,
    position: Position.Top,
    id: "wf-attach",
    style: { background: HANDLE_COLORS.workflow },
  },
  timeoutOut: {
    type: "source" as const,
    position: Position.Bottom,
    id: "timeout-out",
    style: { background: HANDLE_COLORS.timeout },
  },
};

export const NODE_REGISTRY: NodeRegistryEntry[] = [
  {
    type: "start",
    label: "Start",
    icon: "\u25B6",
    color: "#1565C0",
    bgcolor: "#0D47A1",
    desc: "Entry point",
    dot: "#42A5F5",
    summaryKey: "workflowName",
    handles: [FLOW_HANDLES.flowOut],
    fields: [
      {
        key: "workflowName",
        label: "Workflow Name",
        type: "text",
        placeholder: "myWorkflow",
      },
      { key: "params", label: "Parameters", type: "params-editor" },
    ],
    defaults: { workflowName: "myWorkflow", params: [] },
  },
  {
    type: "activity",
    label: "Activity",
    icon: "\u2699",
    color: "#2E7D32",
    bgcolor: "#1B5E20",
    desc: "External call",
    dot: "#66BB6A",
    summaryKey: "activityName",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut, FLOW_HANDLES.dataOut],
    fields: [
      {
        key: "activityName",
        label: "Activity Name",
        type: "text",
        placeholder: "myActivity",
      },
      {
        key: "timeout",
        label: "Timeout",
        type: "text",
        placeholder: "5 seconds",
      },
      { key: "maxAttempts", label: "Max Attempts", type: "number" },
      {
        key: "outputVar",
        label: "Output Variable (optional)",
        type: "text",
        placeholder: "e.g: state.result or result",
      },
    ],
    defaults: {
      activityName: "myActivity",
      timeout: "5 seconds",
      maxAttempts: 10,
      outputVar: "",
    },
  },
  {
    type: "signal",
    label: "Signal",
    icon: "\u26A1",
    color: "#E65100",
    bgcolor: "#BF360C",
    desc: "Async handler",
    dot: "#FFA726",
    summaryKey: "signalName",
    handles: [
      {
        type: "source",
        position: Position.Right,
        id: "flow-out",
        style: { background: HANDLE_COLORS.flow },
      },
      FLOW_HANDLES.wfAttach,
    ],
    fields: [
      {
        key: "signalName",
        label: "Signal Name",
        type: "text",
        placeholder: "mySignal",
      },
      {
        key: "params",
        label: "Parameters",
        type: "text",
        placeholder: "event: unknown",
      },
      {
        key: "stateUpdates",
        label: "State Updates",
        type: "textarea",
        placeholder: "status = 'updated'",
      },
    ],
    defaults: {
      signalName: "mySignal",
      params: "event: unknown",
      stateUpdates: "status",
    },
  },
  {
    type: "query",
    label: "Query",
    icon: "\uD83D\uDD0D",
    color: "#6A1B9A",
    bgcolor: "#4A148C",
    desc: "Read state",
    dot: "#AB47BC",
    summaryKey: "queryName",
    handles: [FLOW_HANDLES.wfAttach],
    fields: [
      {
        key: "queryName",
        label: "Query Name",
        type: "text",
        placeholder: "getState",
      },
      {
        key: "returnType",
        label: "Return Type (optional)",
        type: "text",
        placeholder: "WorkflowState",
      },
      {
        key: "code",
        label: "Return Expression",
        type: "code",
        placeholder:
          "// Return data from workflow state\nreturn { status: state.status, items: state.items };",
      },
    ],
    defaults: { queryName: "getState", returnType: "", code: "return state;" },
  },
  {
    type: "update",
    label: "Update",
    icon: "\u270F\uFE0F",
    color: "#0277BD",
    bgcolor: "#01579B",
    desc: "Sync mutation",
    dot: "#29B6F6",
    summaryKey: "updateName",
    handles: [
      {
        type: "source",
        position: Position.Right,
        id: "flow-out",
        style: { background: HANDLE_COLORS.flow },
      },
      FLOW_HANDLES.wfAttach,
    ],
    fields: [
      {
        key: "updateName",
        label: "Update Name",
        type: "text",
        placeholder: "myUpdate",
      },
      {
        key: "params",
        label: "Parameters",
        type: "text",
        placeholder: "data: unknown",
      },
      { key: "async", label: "Async", type: "toggle" },
    ],
    defaults: { updateName: "myUpdate", params: "data: unknown", async: false },
  },
  {
    type: "childWorkflow",
    label: "Child Workflow",
    icon: "\uD83D\uDD17",
    color: "#AD1457",
    bgcolor: "#880E4F",
    desc: "Sub-workflow",
    dot: "#EC407A",
    summaryKey: "workflowName",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut],
    fields: [
      {
        key: "workflowName",
        label: "Workflow Name",
        type: "text",
        placeholder: "childWorkflow",
      },
      {
        key: "workflowId",
        label: "Workflow ID",
        type: "text",
        placeholder: "child-{referenceId}",
      },
      {
        key: "args",
        label: "Arguments",
        type: "textarea",
        placeholder: "data",
      },
    ],
    defaults: {
      workflowName: "childWorkflow",
      workflowId: "child-{referenceId}",
      args: "data",
    },
  },
  {
    type: "condition",
    label: "Condition/Wait",
    icon: "\u23F3",
    color: "#F9A825",
    bgcolor: "#F57F17",
    desc: "Wait for",
    dot: "#FFEE58",
    summaryKey: "condition",
    handles: [
      FLOW_HANDLES.flowIn,
      FLOW_HANDLES.flowOut,
      FLOW_HANDLES.timeoutOut,
    ],
    fields: [
      {
        key: "condition",
        label: "Condition",
        type: "code",
        placeholder: "!!state.result",
      },
      {
        key: "timeout",
        label: "Timeout",
        type: "text",
        placeholder: "15 minutes",
      },
    ],
    defaults: { condition: "!!state.result", timeout: "15 minutes" },
  },
  {
    type: "sleep",
    label: "Sleep",
    icon: "\uD83D\uDCA4",
    color: "#546E7A",
    bgcolor: "#37474F",
    desc: "Timer",
    dot: "#90A4AE",
    summaryKey: "duration",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut],
    fields: [
      {
        key: "duration",
        label: "Duration",
        type: "text",
        placeholder: "1 minute",
      },
    ],
    defaults: { duration: "1 minute" },
  },
  {
    type: "end",
    label: "End",
    icon: "\u23F9",
    color: "#C62828",
    bgcolor: "#B71C1C",
    desc: "Return value",
    dot: "#EF5350",
    summaryKey: "returnValue",
    handles: [FLOW_HANDLES.flowIn],
    fields: [
      {
        key: "returnValue",
        label: "Return Value",
        type: "code",
        placeholder: "state",
      },
    ],
    defaults: { returnValue: "state" },
  },
  {
    type: "textPrompt",
    label: "Text Prompt",
    icon: "\uD83D\uDCAC",
    color: "#7b2ff7",
    bgcolor: "#4a0e8f",
    desc: "AI prompt",
    dot: "#ff007c",
    summaryKey: "prompt",
    handles: [
      {
        type: "target",
        position: Position.Left,
        id: "prompt-in",
        style: { background: "#7aa2f7" },
      },
      {
        type: "source",
        position: Position.Right,
        id: "prompt-out",
        style: { background: "#9ece6a" },
      },
    ],
    fields: [
      {
        key: "prompt",
        label: "Prompt",
        type: "textarea",
        placeholder: "Describe workflow changes...",
      },
    ],
    defaults: { prompt: "" },
  },
  {
    type: "aiGeneration",
    label: "AI Generation",
    icon: "\uD83E\uDD16",
    color: "#1a2233",
    bgcolor: "#1a2233",
    desc: "AI generate",
    dot: "#9ece6a",
    summaryKey: "result",
    handles: [
      {
        type: "target",
        position: Position.Left,
        id: "gen-in",
        style: { background: "#7aa2f7" },
      },
      {
        type: "source",
        position: Position.Right,
        id: "gen-out",
        style: { background: "#9ece6a" },
      },
    ],
    fields: [{ key: "result", label: "Result", type: "textarea" }],
    defaults: { result: "" },
  },
  {
    type: "customCode",
    label: "Custom Code",
    icon: "{ }",
    color: "#5C6BC0",
    bgcolor: "#3949AB",
    desc: "JS logic",
    dot: "#7986CB",
    summaryKey: "label",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut, FLOW_HANDLES.dataOut],
    fields: [
      {
        key: "label",
        label: "Label",
        type: "text",
        placeholder: "Custom logic",
      },
      {
        key: "code",
        label: "Code",
        type: "code",
        placeholder:
          "// Access state vars and previous outputs\nconst result = state.items.filter(i => i.active);\nreturn result;",
      },
      {
        key: "outputVar",
        label: "Output Variable (optional)",
        type: "text",
        placeholder: "e.g: state.my_variable or my_variable",
      },
    ],
    defaults: {
      label: "Custom logic",
      code: "// Access state and previous outputs\nconst result = state;\nreturn result;",
      outputVar: "",
    },
  },
  {
    type: "variableChange",
    label: "Variable Change",
    icon: "x=",
    color: "#00897B",
    bgcolor: "#00695C",
    desc: "Set variable",
    dot: "#4DB6AC",
    summaryKey: "variable",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut],
    fields: [
      {
        key: "label",
        label: "Label",
        type: "text",
        placeholder: "Update status",
      },
      {
        key: "variable",
        label: "Variable",
        type: "text",
        placeholder: "state.status",
      },
      {
        key: "value",
        label: "Value",
        type: "code",
        placeholder: '"completed"',
      },
    ],
    defaults: {
      label: "Update variable",
      variable: "state.status",
      value: '"completed"',
    },
  },
  {
    type: "apiCall",
    label: "API Call",
    icon: "\uD83C\uDF10",
    color: "#7B1FA2",
    bgcolor: "#6A1B9A",
    desc: "HTTP request",
    dot: "#CE93D8",
    summaryKey: "label",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut, FLOW_HANDLES.dataOut],
    fields: [
      { key: "label", label: "Label", type: "text", placeholder: "Fetch data" },
      {
        key: "url",
        label: "URL",
        type: "text",
        placeholder: "https://api.example.com/data",
      },
      {
        key: "method",
        label: "Method",
        type: "select",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "DELETE", value: "DELETE" },
          { label: "PATCH", value: "PATCH" },
        ],
      },
      {
        key: "headers",
        label: "Headers",
        type: "code",
        placeholder: '{ "Content-Type": "application/json" }',
      },
      {
        key: "body",
        label: "Body",
        type: "code",
        placeholder: '{ "key": "value" }',
      },
      {
        key: "outputVar",
        label: "Output Variable (optional)",
        type: "text",
        placeholder: "e.g: state.apiData or response",
      },
    ],
    defaults: {
      label: "API request",
      url: "https://api.example.com/data",
      method: "GET",
      headers: '{ "Content-Type": "application/json" }',
      body: "",
      outputVar: "",
    },
  },
  {
    type: "loop",
    label: "Loop",
    icon: "↻",
    color: "#00796B",
    bgcolor: "#004D40",
    desc: "Repeat actions",
    dot: "#4DB6AC",
    summaryKey: "label",
    handles: [FLOW_HANDLES.flowIn, FLOW_HANDLES.flowOut],
    fields: [
      {
        key: "label",
        label: "Label",
        type: "text",
        placeholder: "Loop over items",
      },
      {
        key: "loopType",
        label: "Loop Type",
        type: "select",
        options: [
          { label: "Collection (for...of)", value: "collection" },
          { label: "Count (N times)", value: "count" },
        ],
      },
      {
        key: "countOrCollection",
        label: "Loop for",
        type: "text",
        placeholder: "state.items  or  5",
      },
      {
        key: "itemVar",
        label: "Item Variable",
        type: "text",
        placeholder: "item",
      },
      {
        key: "outputVar",
        label: "Output Variable (optional)",
        type: "text",
        placeholder: "e.g: state.results or results",
      },
    ],
    defaults: {
      label: "Loop",
      loopType: "collection",
      countOrCollection: "state.items",
      itemVar: "item",
      outputVar: "",
    },
  },
];

/** Map of type → registry entry for O(1) lookup */
export const NODE_REGISTRY_MAP = new Map(NODE_REGISTRY.map((e) => [e.type, e]));

/** Get registry entry by node type */
export function getNodeConfig(
  type: WorkflowNodeType,
): NodeRegistryEntry | undefined {
  return NODE_REGISTRY_MAP.get(type);
}

/** Get summary text from node data */
export function getNodeSummary(
  type: string,
  data: Record<string, unknown>,
): string {
  const entry = NODE_REGISTRY_MAP.get(type as WorkflowNodeType);
  if (!entry) return type;
  const value = data[entry.summaryKey];
  if (typeof value === "string" && value) return value.slice(0, 40);
  return entry.label;
}

/** Get default data for a node type */
export function getNodeDefaults(
  type: WorkflowNodeType,
): Record<string, unknown> {
  return NODE_REGISTRY_MAP.get(type)?.defaults ?? {};
}
