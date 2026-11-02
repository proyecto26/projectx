import type { ConfigService } from "@nestjs/config";
import {
  type BundleOptions,
  bundleWorkflowCode,
  NativeConnection,
  type NativeConnectionOptions,
  type WorkerOptions,
} from "@temporalio/worker";

export interface CreateWorkerOptions {
  /** Path to the workflows, bundled when the worker starts. */
  workflowsPath?: string;
  /** Bundle built ahead of time, recommended in production. */
  workflowBundle?: WorkerOptions["workflowBundle"];
  /** Options for the Temporal bundler, used with `workflowsPath`. */
  bundlerOptions?: Omit<BundleOptions, "workflowsPath">;
  /** Defaults to the `temporal.host` configuration value. */
  connectionOptions?: NativeConnectionOptions;
  /** Defaults to the `temporal.namespace` configuration value. */
  namespace?: string;
  /** Defaults to the `temporal.taskQueue` configuration value. */
  taskQueue?: string;
}

/**
 * Creates a worker options object for the Temporal worker.
 *
 * Workflow code runs in a sandbox, so it can only import pure modules: workflow
 * definitions, enums and types. Importing a package that loads NestJS from a
 * workflow makes this bundling step fail.
 *
 * @param config - The NestJS configuration service.
 * @param options - Where to find the workflows and how to reach Temporal.
 * @returns A Promise resolving to the worker options object.
 */
export async function createWorkerOptions(
  config: ConfigService,
  options: CreateWorkerOptions,
): Promise<WorkerOptions> {
  const { workflowsPath, bundlerOptions } = options;
  let { workflowBundle } = options;
  if (!workflowBundle) {
    if (!workflowsPath) {
      throw new Error("Either workflowsPath or workflowBundle is required");
    }
    workflowBundle = await bundleWorkflowCode({
      ...bundlerOptions,
      workflowsPath,
    });
  }

  const connection = await NativeConnection.connect(
    options.connectionOptions ?? { address: config.get("temporal.host") },
  );

  return {
    connection,
    namespace: options.namespace ?? config.get("temporal.namespace"),
    taskQueue:
      options.taskQueue ?? (config.get("temporal.taskQueue") as string),
    workflowBundle,
  };
}
