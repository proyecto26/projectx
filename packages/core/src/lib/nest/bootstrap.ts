import {
  type NestApplicationOptions,
  type Type,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { Environment } from "@projectx/models";
import { Logger, LoggerErrorInterceptor } from "nestjs-pino";

import { setupAppSecurity } from "../security";
import { setupAppSwagger } from "../swagger";

const TRUSTED_IPS = ["127.0.0.1"];

type NestFactoryCreate = [
  module: Type<unknown>,
  options?: NestApplicationOptions,
];

let logger: Logger;

// Declare module for HMR support
declare const module: any;

export async function bootstrapApp<T extends NestExpressApplication>(
  ...params: NestFactoryCreate
) {
  try {
    // Enable logging to buffer
    params[1] = params[1] || {};
    params[1].bufferLogs = true;

    // Initialize app
    const app = await NestFactory.create<T>(...params);

    logger = app.get(Logger);
    app.useLogger(logger);
    app.useGlobalInterceptors(new LoggerErrorInterceptor());

    const configService = app.get(ConfigService);
    const env = configService.get("app.environment");
    const port = configService.get("app.port");
    const apiPrefix = configService.get("app.apiPrefix");

    app.setGlobalPrefix(apiPrefix, {
      exclude: ["/health"],
    });

    // PARSE HTTP REQUESTS
    app.useBodyParser("urlencoded", { limit: "50mb", extended: true });
    app.useBodyParser("json", { limit: "10mb" });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // SECURITY
    setupAppSecurity(app);
    logger.log("Security is enabled");

    // Local development
    if (env === Environment.Development) {
      app.enableShutdownHooks();
      logger.log("Shutdown hooks are enabled");
    }

    // Register the proxy's IP address (load balancer or reverse proxy)
    app.set("trust proxy", (ip: string) => TRUSTED_IPS.includes(ip));
    logger.log("Trusted IPs are set");

    // Enable Swagger UI
    if (env !== Environment.Production) {
      setupAppSwagger(app);
      logger.log("Swagger is enabled");
    }

    logger.debug(`Starting app on port ${port}, env: ${env}`);
    await app.listen(port, "0.0.0.0");
    logger.log(`🚀 Application is running on port ${port}`);

    // Hot Module Replacement
    if (module.hot) {
      module.hot.accept();
      module.hot.dispose(() => app.close());
      logger.log("🔥 Hot Module Replacement enabled");
    }

    return app;
  } catch (error) {
    logger?.error(`Failed to start application, error: ${error}`);
    throw error;
  }
}
