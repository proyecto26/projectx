export interface WorkflowSpec {
  workflowName: string;
  params: string;
  mode: "create" | "modify";
  source: {
    path: string;
    utilsPath: string;
    service: string;
  } | null;
  steps: Array<
    | {
        type: "activity";
        name: string;
        timeout: string;
        retryPolicy: { maxAttempts: number };
      }
    | { type: "childWorkflow"; name: string; workflowId: string; args: string }
    | { type: "condition"; waitFor: string; timeout: string }
    | { type: "sleep"; duration: string }
  >;
  signals: Array<{ name: string; params: string; stateUpdates: string }>;
  queries: Array<{ name: string; returnType: string }>;
  updates: Array<{ name: string; params: string; async: boolean }>;
  returnValue?: string;
}
