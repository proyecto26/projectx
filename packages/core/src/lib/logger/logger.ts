import { Environment } from "@projectx/models";
import type { Request } from "express";
import type { LoggerOptions } from "pino";
import { v4 as uuidv4 } from "uuid";

export function createLoggerOptions(
  level: string,
  serviceName: string,
  environment: Environment,
) {
  const isProduction = environment === Environment.Production;

  return {
    level,
    name: serviceName,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    base: { service: serviceName },
    transport: !isProduction
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    // Generate a correlation ID for each request
    mixin: (request: Request) => ({
      correlationId: request.headers["x-correlation-id"] || uuidv4(),
    }),
  } as LoggerOptions;
}
