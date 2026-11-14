import { continueAsNew, workflowInfo } from "@temporalio/workflow";

const MAX_NUMBER_OF_EVENTS = 10000;
// It's just an example of a long running workflow
export async function longRunningWorkflow(n: number): Promise<void> {
  // Long-duration workflow
  while (workflowInfo().historyLength < MAX_NUMBER_OF_EVENTS) {
    //...
  }

  await continueAsNew<typeof longRunningWorkflow>(n + 1);
}
