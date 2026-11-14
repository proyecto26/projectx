import { proxyActivities } from "@temporalio/workflow";

import type { GreetingActivities } from "./activities";

const { greet } = proxyActivities<GreetingActivities>({
  startToCloseTimeout: "10 seconds",
});

export async function greetingWorkflow(name: string): Promise<string> {
  return greet(name);
}
