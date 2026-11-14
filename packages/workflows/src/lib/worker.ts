import type { ConfigService } from "@nestjs/config";
import type {
  BundleOptions,
  NativeConnectionOptions,
  WorkerOptions,
} from "@temporalio/worker";

import {
  connectWorker,
  resolveWorkerTarget,
  resolveWorkflowBundle,
} from "./worker-setup";

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
 * The returned `connection` belongs to the caller, who must close it once the
 * worker has stopped. `WorkerService` doesn't use this function: it opens and
 * closes its own connection.
 *
 * @param config - The NestJS configuration service.
 * @param options - Where to find the workflows and how to reach Temporal.
 * @returns A Promise resolving to the worker options object.
 */
export async function createWorkerOptions(
  config: ConfigService,
  options: CreateWorkerOptions,
): Promise<WorkerOptions> {
  const workflowBundle = await resolveWorkflowBundle(options);
  const connection = await connectWorker(config, options);
  return {
    connection,
    ...resolveWorkerTarget(config, options),
    workflowBundle,
  };
}
