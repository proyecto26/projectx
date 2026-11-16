import { createRequire } from "node:module";
import { createLoggerOptions } from "@projectx/core/logger";
import pino from "pino";

const loggerOptions = createLoggerOptions("info", "web");

// pino resolves a transport target from the files on the call stack. Under the
// Vite dev server those frames are module-runner code, so a bare "pino-pretty"
// can't be found there: resolve it from this file instead.
const transport = loggerOptions.transport;
if (transport && "target" in transport && transport.target === "pino-pretty") {
  transport.target = createRequire(import.meta.url).resolve("pino-pretty");
}

export const logger = pino(loggerOptions);
