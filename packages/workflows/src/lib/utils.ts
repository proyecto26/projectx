import type { Logger } from "@nestjs/common";

/**
 * Waits for `ms` milliseconds. Resolves early, without an error, as soon as
 * `signal` aborts, so a retry loop can stop waiting when the app shuts down.
 */
export const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const done = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal?.addEventListener("abort", done, { once: true });
  });

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Logs with `fatal` when the installed NestJS version has it (10.2+). */
export function logFatal(logger: Logger, message: string, error: unknown) {
  const stack = error instanceof Error ? error.stack : undefined;
  if (typeof logger.fatal === "function") {
    logger.fatal(message, stack);
  } else {
    logger.error(message, stack);
  }
}

/**
 * A promise settled once, from outside. A no-op handler is attached so a
 * rejection nobody waits for is not reported as unhandled.
 */
export class Deferred {
  readonly promise: Promise<void>;
  private settled = false;
  private resolveFn: () => void = () => undefined;
  private rejectFn: (reason: unknown) => void = () => undefined;

  constructor() {
    this.promise = new Promise<void>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
    this.promise.catch(() => undefined);
  }

  resolve() {
    if (this.settled) return;
    this.settled = true;
    this.resolveFn();
  }

  reject(reason: unknown) {
    if (this.settled) return;
    this.settled = true;
    this.rejectFn(reason);
  }
}

export function resolveRetry(
  retry: { attempts?: number; delayMs?: number } | undefined,
  defaults: { attempts: number; delayMs: number },
) {
  const attempts = Math.max(
    1,
    Math.floor(retry?.attempts ?? defaults.attempts),
  );
  const delayMs = Math.max(0, retry?.delayMs ?? defaults.delayMs);
  return { attempts, delayMs };
}
