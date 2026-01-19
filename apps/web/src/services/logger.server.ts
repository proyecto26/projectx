import { createLoggerOptions } from "@projectx/core/logger";
import pino from "pino";

const loggerOptions = createLoggerOptions("info", "web");
export const logger = pino(loggerOptions);
