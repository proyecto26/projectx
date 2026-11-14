/**
 * Lifecycle of `WorkerService` and `ClientService`:
 *
 * - `starting`: connecting, or waiting between retries.
 * - `running`: the worker is polling, or the client is connected.
 * - `failed`: every attempt failed, or the worker stopped with an error.
 * - `stopped`: the module was destroyed, or the worker shut down.
 */
export type ServiceStatus = "starting" | "running" | "failed" | "stopped";

export interface StartupRetryOptions {
  /** Number of attempts before giving up. */
  attempts?: number;
  /** Time to wait between attempts, in milliseconds. */
  delayMs?: number;
}

export interface StartupOptions {
  /**
   * Call `process.exit(1)` after logging when the worker or client can't start
   * after every retry, or when the running worker stops with an error.
   * Set it to `false` to keep the process alive and check `ready()` or
   * `getStatus()` instead.
   *
   * @default true
   */
  exitOnStartupFailure?: boolean;
  /**
   * How many times to try to start, and how long to wait in between. Defaults
   * to 5 attempts 10 seconds apart for the worker, and 10 attempts 5 seconds
   * apart for the client.
   */
  startupRetry?: StartupRetryOptions;
}
