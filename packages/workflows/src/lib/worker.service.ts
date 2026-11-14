import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DefaultLogger,
  type LogLevel,
  type NativeConnection,
  Runtime,
  Worker,
  type WorkerOptions,
} from "@temporalio/worker";
import { WORKER_OPTIONS_TOKEN } from "./constants";
import type { ServiceStatus, StartupOptions } from "./lifecycle";
import { Deferred, delay, errorMessage, logFatal, resolveRetry } from "./utils";
import type { CreateWorkerOptions } from "./worker";
import {
  connectWorker,
  resolveWorkerTarget,
  resolveWorkflowBundle,
} from "./worker-setup";

export interface WorkerServiceOptions<T>
  extends CreateWorkerOptions,
    StartupOptions {
  activitiesService: T;
}

/** Prototype members that are never registered as activities */
export const RESTRICTED_PROPERTIES = [
  "constructor",
  "caller",
  "callee",
  "arguments",
];

const DEFAULT_RETRY = { attempts: 5, delayMs: 10_000 };

@Injectable()
export class WorkerService<T extends Record<string, unknown>>
  implements OnModuleInit, OnModuleDestroy
{
  readonly logger = new Logger(WorkerService.name);
  private worker?: Worker;
  private connection?: NativeConnection;
  private runPromise?: Promise<void>;
  private startupPromise?: Promise<void>;
  private status: ServiceStatus = "starting";
  private readonly abortController = new AbortController();
  private readonly readiness = new Deferred();

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(WORKER_OPTIONS_TOKEN)
    private readonly workerOptions: WorkerServiceOptions<T>,
  ) {}

  /**
   * Starts the worker in the background, so the app bootstrap doesn't wait for
   * Temporal. Use `ready()` to wait for it.
   */
  async onModuleInit() {
    this.startupPromise ??= this.start();
  }

  /**
   * Stops a pending retry loop, shuts the worker down, waits until it has
   * drained, and closes its connection.
   */
  async onModuleDestroy() {
    this.abortController.abort();
    await this.startupPromise;

    const worker = this.worker;
    if (worker?.getState() === "RUNNING") {
      this.logger.debug("Shutting down the Temporal worker...");
      try {
        worker.shutdown();
      } catch (error) {
        this.logger.error(
          `Failed to shut down the Temporal worker: ${errorMessage(error)}`,
        );
      }
    }
    await this.runPromise;
    await this.closeConnection();

    if (this.status !== "failed") {
      this.status = "stopped";
    }
    this.readiness.reject(
      new Error("The Temporal worker was stopped before it started"),
    );
  }

  /**
   * Resolves once the worker is running. Rejects with the last error when every
   * attempt failed, or when the module is destroyed before the worker starts.
   */
  ready(): Promise<void> {
    return this.readiness.promise;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  private async start() {
    try {
      await this.initializeWorkerWithRetry();
    } catch (error) {
      if (this.abortController.signal.aborted) {
        this.readiness.reject(error);
        return;
      }
      await this.fail(error, "The Temporal worker failed to start");
    }
  }

  private installRuntime() {
    const logLevel = this.configService.get("app.logLevel") || "info";
    const workerLogger = new Logger("TemporalWorker");
    try {
      Runtime.install({
        logger: new DefaultLogger(
          `${logLevel}`.toUpperCase() as LogLevel,
          (entry) => {
            workerLogger.debug({
              message: entry.message,
              timestamp: entry.timestampNanos,
              ...entry.meta,
            });
          },
        ),
      });
    } catch (error) {
      // The runtime is a process-wide singleton: another worker, or the
      // testing environment, may have installed it already.
      this.logger.warn(
        `Keeping the Temporal runtime already installed: ${errorMessage(error)}`,
      );
    }
  }

  private getActivities() {
    const activitiesServiceInstance = this.workerOptions.activitiesService;
    return Object.getOwnPropertyNames(
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
          acc[key] = property.bind(activitiesServiceInstance);
        }
        return acc;
      },
      {} as Record<string, (...args: unknown[]) => unknown>,
    );
  }

  private async initializeWorkerWithRetry() {
    const { attempts, delayMs } = resolveRetry(
      this.workerOptions.startupRetry,
      DEFAULT_RETRY,
    );
    const signal = this.abortController.signal;
    const {
      activitiesService: _,
      exitOnStartupFailure: _exit,
      startupRetry: _retry,
      ...createOptions
    } = this.workerOptions;

    this.installRuntime();
    let workflowBundle: WorkerOptions["workflowBundle"];

    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (signal.aborted) return;
      try {
        this.logger.debug(`🚀 Attempt ${attempt} to start Temporal worker...`);
        workflowBundle ??= await resolveWorkflowBundle(createOptions);
        if (signal.aborted) return;

        const connection = await connectWorker(
          this.configService,
          createOptions,
        );
        this.connection = connection;
        if (signal.aborted) return;

        const worker = await Worker.create({
          connection,
          ...resolveWorkerTarget(this.configService, createOptions),
          workflowBundle,
          activities: this.getActivities(),
        });
        this.worker = worker;
        // Run even when the module is being destroyed, so the worker releases
        // its connection once it's shut down.
        this.runPromise = this.track(worker);
        if (signal.aborted) return;

        this.status = "running";
        this.readiness.resolve();
        this.logger.debug("🏃 Temporal worker is running!");
        return;
      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed: ${errorMessage(error)}`);
        await this.closeConnection();
        if (signal.aborted) return;
        if (attempt >= attempts) {
          this.logger.error("All retry attempts failed.");
          throw error;
        }
        this.logger.debug(`Retrying in ${delayMs / 1000} seconds...`);
        await delay(delayMs, signal);
      }
    }
  }

  /** Runs the worker. The returned promise settles when it stops, and never rejects. */
  private async track(worker: Worker) {
    try {
      await worker.run();
      if (!this.abortController.signal.aborted) {
        this.logger.warn("The Temporal worker stopped");
        this.status = "stopped";
        await this.closeConnection();
      }
    } catch (error) {
      if (this.abortController.signal.aborted) {
        this.logger.error(
          `The Temporal worker failed while shutting down: ${errorMessage(error)}`,
        );
        return;
      }
      await this.fail(error, "The Temporal worker stopped with an error");
    }
  }

  private async fail(error: unknown, message: string) {
    this.status = "failed";
    logFatal(this.logger, `${message}: ${errorMessage(error)}`, error);
    this.readiness.reject(error);
    await this.closeConnection();
    if (this.workerOptions.exitOnStartupFailure ?? true) {
      process.exit(1);
    }
  }

  private async closeConnection() {
    const connection = this.connection;
    this.connection = undefined;
    if (!connection) return;
    try {
      await connection.close();
    } catch (error) {
      this.logger.error(
        `Failed to close the Temporal worker connection: ${errorMessage(error)}`,
      );
    }
  }
}
