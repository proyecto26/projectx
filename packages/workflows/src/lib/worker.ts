import type { ConfigService } from "@nestjs/config";
import {
  bundleWorkflowCode,
  NativeConnection,
  type WorkerOptions,
} from "@temporalio/worker";

/**
 * Creates a worker options object for the Temporal worker.
 * @param config - The NestJS configuration service.
 * @param workflowsPath - The path to the workflows directory.
 * @returns A Promise resolving to the worker options object.
 */
export async function createWorkerOptions(
  config: ConfigService,
  workflowsPath: string,
): Promise<WorkerOptions> {
  const temporalHost = config.get("temporal.host");
  const temporalNamespace = config.get("temporal.namespace");
  const temporalTaskQueue = config.get("temporal.taskQueue");
  const connection = await NativeConnection.connect({
    address: temporalHost,
    // tls configuration
  });

  const workflowBundle = await bundleWorkflowCode({
    workflowsPath,
  });

  return {
    connection,
    namespace: temporalNamespace,
    taskQueue: temporalTaskQueue,
    workflowBundle,
  };
}
