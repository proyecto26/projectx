/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { createLoggerOptions } from "@projectx/core";
import { DefaultLogger, Runtime, Worker } from "@temporalio/worker";
import pino from "pino";
import { WORKER_OPTIONS_TOKEN } from "./constants";
import { delay } from "./utils";
import { createWorkerOptions } from "./worker";

export interface WorkerServiceOptions<T> {
  activitiesService: T;
  workflowsPath: string;
}

export const RESTRICTED_PROPERTIES = ["caller", "callee", "arguments"];

@Injectable()
export class WorkerService<T extends Record<string, unknown>>
  implements OnModuleInit, OnModuleDestroy
{
  readonly logger = new Logger(WorkerService.name);
  private worker?: Worker;
  constructor(
    private readonly configService: ConfigService,
    @Inject(WORKER_OPTIONS_TOKEN)
    private readonly workerOptions: WorkerServiceOptions<T>,
  ) {}

  async onModuleInit() {
    this.initializeWorkerWithRetry();
  }

  async onModuleDestroy() {
    this.worker?.shutdown();
  }

  private async initializeWorkerWithRetry(retries = 5, delayMs = 10000) {
    const logLevel = this.configService.get("app.logLevel") || "info";
    const apiPrefix = this.configService.get("app.apiPrefix");
    const environment = this.configService.get("app.environment");
    const loggerOptions = createLoggerOptions(logLevel, apiPrefix, environment);
    const pinoLogger = pino(loggerOptions);
    // Create loggers with different labels for the separate components
    const workerLogger = pinoLogger.child<string>({ label: "worker" });

    Runtime.install({
      logger: new DefaultLogger(logLevel, (entry) => {
        workerLogger.debug({
          message: entry.message,
          timestamp: entry.timestampNanos,
          ...entry.meta,
        });
      }),
    });

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`🚀 Attempt ${attempt} to start Temporal worker...`);
        const activitiesServiceInstance = this.workerOptions.activitiesService;

        const activities = Object.getOwnPropertyNames(
          Object.getPrototypeOf(activitiesServiceInstance),
        ).reduce(
          (acc, key) => {
            const property = activitiesServiceInstance[key];
            // Verify if the property is a function and not restricted
            if (
              !RESTRICTED_PROPERTIES.includes(key) &&
              typeof property === "function"
            ) {
              // Bind the context of the service to the function
              acc[key] = property.bind(this.workerOptions.activitiesService);
            }
            return acc;
          },
          {} as Record<string, Function>,
        );

        const workerOptions = await createWorkerOptions(
          this.configService,
          this.workerOptions.workflowsPath,
        );

        const worker = await Worker.create({
          ...workerOptions,
          activities,
        });

        await worker.run();
        this.worker = worker;
        this.logger.debug("🏃 Temporal worker is running!");
        return; // Exit the function if the worker starts successfully
      } catch (error) {
        this.logger.error(
          `Attempt ${attempt} failed: ${(error as Error).message}`,
        );
        if (attempt < retries) {
          this.logger.debug(`Retrying in ${delayMs / 1000} seconds...`);
          await delay(delayMs);
        } else {
          this.logger.error("All retry attempts failed.");
          throw error; // Rethrow the error after all retries have failed
        }
      }
    }
  }
}
