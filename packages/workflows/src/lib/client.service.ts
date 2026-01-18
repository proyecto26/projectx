import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, Connection } from "@temporalio/client";

import { delay } from "./utils";

@Injectable()
export class ClientService implements OnModuleInit, OnModuleDestroy {
  readonly logger = new Logger(ClientService.name);
  public client?: Client;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.initializeClientWithRetry();
  }

  async onModuleDestroy() {
    this.client?.connection.close();
  }

  private async initializeClientWithRetry(retries = 10, delayMs = 5000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`🚀 Attempt ${attempt} to start Temporal client...`);
        const temporalHost = this.configService.get<string>("temporal.host");
        const temporalNamespace =
          this.configService.get<string>("temporal.namespace");

        const connection = await Connection.connect({
          address: temporalHost,
          connectTimeout: 10000,
        });

        this.client = new Client({
          connection,
          namespace: temporalNamespace,
        });

        this.logger.debug("🏃 Temporal client is running!");
        return;
      } catch (error) {
        if (error instanceof Error) {
          this.logger.error(`Attempt ${attempt} failed: ${error.message}`);
        } else {
          this.logger.error(`Attempt ${attempt} failed: ${error}`);
        }
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
