import path from "node:path";
import type { ConfigService } from "@nestjs/config";
import {
  bundleWorkflowCode,
  NativeConnection,
  type WorkerOptions,
} from "@temporalio/worker";
import TsconfigPathsPlugin from "tsconfig-paths-webpack-plugin";
import { NormalModuleReplacementPlugin } from "webpack";

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
    webpackConfigHook: (config) => {
      const mocksPath = path.join(__dirname, "temporal-mocks.js");

      config.resolve = config.resolve || {};
      config.resolve.plugins = [
        ...(config.resolve.plugins ?? []),
        new TsconfigPathsPlugin({
          baseUrl: path.dirname((config.entry as string[])[0] ?? ""),
        }),
      ];

      // Use a robust mock for backend packages using a regex to simplify the configuration.
      // This solves monorepo conflicts where shared packages pull in backend decorators.
      config.plugins = [
        ...(config.plugins ?? []),
        new NormalModuleReplacementPlugin(
          /(@nestjs\/.*|class-validator|class-transformer|express|reflect-metadata)/,
          mocksPath,
        ),
      ];

      // Keep node: aliases to false as these are usually just required, not called as functions
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "node:fs": false,
        "node:path": false,
        "node:http": false,
        "node:https": false,
        "node:querystring": false,
        "node:os": false,
        "node:crypto": false,
        "node:zlib": false,
        "node:stream": false,
        "node:util": false,
        "node:url": false,
        "node:events": false,
        "node:buffer": false,
      };

      // Clear externals to ensure that aliasing takes precedence and all code
      // is bundled into the Workflow sandbox without leaving 'require()' calls.
      config.externals = [];

      return config;
    },
  });

  return {
    connection,
    namespace: temporalNamespace,
    taskQueue: temporalTaskQueue,
    workflowBundle,
  };
}
