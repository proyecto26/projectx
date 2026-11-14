import type { ConfigService } from "@nestjs/config";
import {
  bundleWorkflowCode,
  NativeConnection,
  type WorkerOptions,
} from "@temporalio/worker";

import type { CreateWorkerOptions } from "./worker";

/** Returns the prebuilt bundle, or bundles `workflowsPath`. */
export async function resolveWorkflowBundle(
  options: CreateWorkerOptions,
): Promise<NonNullable<WorkerOptions["workflowBundle"]>> {
  const { workflowsPath, bundlerOptions, workflowBundle } = options;
  if (workflowBundle) {
    return workflowBundle;
  }
  if (!workflowsPath) {
    throw new Error("Either workflowsPath or workflowBundle is required");
  }
  return bundleWorkflowCode({ ...bundlerOptions, workflowsPath });
}

/** Opens the connection a worker uses. The caller owns and closes it. */
export function connectWorker(
  config: ConfigService,
  options: CreateWorkerOptions,
): Promise<NativeConnection> {
  return NativeConnection.connect(
    options.connectionOptions ?? { address: config.get("temporal.host") },
  );
}

export function resolveWorkerTarget(
  config: ConfigService,
  options: CreateWorkerOptions,
) {
  return {
    namespace: options.namespace ?? config.get<string>("temporal.namespace"),
    taskQueue:
      options.taskQueue ?? (config.get("temporal.taskQueue") as string),
  };
}
