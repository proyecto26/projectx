import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
  Optional,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, Connection } from "@temporalio/client";

import { WORKER_OPTIONS_TOKEN } from "./constants";
import type { ServiceStatus, StartupOptions } from "./lifecycle";
import { Deferred, delay, errorMessage, logFatal, resolveRetry } from "./utils";

const DEFAULT_RETRY = { attempts: 10, delayMs: 5000 };

@Injectable()
export class ClientService implements OnModuleInit, OnModuleDestroy {
  readonly logger = new Logger(ClientService.name);
  public client?: Client;
  private connection?: Connection;
  private initPromise?: Promise<void>;
  private status: ServiceStatus = "starting";
  private readonly abortController = new AbortController();
  private readonly readiness = new Deferred();

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional()
    @Inject(WORKER_OPTIONS_TOKEN)
    private readonly options: StartupOptions = {},
  ) {}

  /**
   * Connects in the background, so the app bootstrap doesn't wait for
   * Temporal. Use `ready()` to wait for the client.
   */
  async onModuleInit() {
    this.initPromise ??= this.start();
  }

  /** Stops a pending retry loop and closes the connection. */
  async onModuleDestroy() {
    this.abortController.abort();
    await this.initPromise;
    await this.closeConnection();
    if (this.status !== "failed") {
      this.status = "stopped";
    }
    this.readiness.reject(
      new Error("The Temporal client was stopped before it connected"),
    );
  }

  /**
   * Resolves once `client` is connected. Rejects with the last error when every
   * attempt failed, or when the module is destroyed before it connects.
   */
  ready(): Promise<void> {
    return this.readiness.promise;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  private async start() {
    try {
      await this.initializeClientWithRetry();
    } catch (error) {
      if (this.abortController.signal.aborted) {
        this.readiness.reject(error);
        return;
      }
      this.status = "failed";
      logFatal(
        this.logger,
        `The Temporal client failed to connect: ${errorMessage(error)}`,
        error,
      );
      this.readiness.reject(error);
      if (this.options?.exitOnStartupFailure ?? true) {
        process.exit(1);
      }
    }
  }

  private async initializeClientWithRetry() {
    const { attempts, delayMs } = resolveRetry(
      this.options?.startupRetry,
      DEFAULT_RETRY,
    );
    const signal = this.abortController.signal;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (signal.aborted) return;
      try {
        this.logger.debug(`🚀 Attempt ${attempt} to start Temporal client...`);
        const temporalHost = this.configService.get<string>("temporal.host");
        const temporalNamespace =
          this.configService.get<string>("temporal.namespace");

        const connection = await Connection.connect({
          address: temporalHost,
          connectTimeout: 10000,
        });
        this.connection = connection;
        if (signal.aborted) return;

        this.client = new Client({
          connection,
          namespace: temporalNamespace,
        });
        this.status = "running";
        this.readiness.resolve();
        this.logger.debug("🏃 Temporal client is running!");
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

  private async closeConnection() {
    const connection = this.connection;
    this.connection = undefined;
    if (!connection) return;
    try {
      await connection.close();
    } catch (error) {
      this.logger.error(
        `Failed to close the Temporal client connection: ${errorMessage(error)}`,
      );
    }
  }
}
