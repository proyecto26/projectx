# @proyecto26/temporal-workflows

## 0.1.1

### Patch Changes

- [#32](https://github.com/proyecto26/projectx/pull/32) [`0f54e20`](https://github.com/proyecto26/projectx/commit/0f54e200dfdfdefdbd7000bb17cedf90716f1297) Thanks [@jdnichollsc](https://github.com/jdnichollsc)! - Supports NestJS 12. The peer ranges now accept `@nestjs/common` 12 and `@nestjs/config` 12, next to the 10 and 11 lines and `@nestjs/config` 3 and 4. The package still ships CommonJS and loads the ESM-only Nest 12 packages through `require(esm)`, which needs Node.js 20.19+ or 22.12+, the same floor Nest 12 sets.

- [#35](https://github.com/proyecto26/projectx/pull/35) [`d4bbf49`](https://github.com/proyecto26/projectx/commit/d4bbf4919b2925e2d297cdd8e0d4932069b1077e) Thanks [@jdnichollsc](https://github.com/jdnichollsc)! - Shuts the worker down when the app closes. `WorkerService` used to keep the worker only after it stopped, so `onModuleDestroy` never shut it down, and it left a connection open for every failed attempt. It now shuts the worker down, waits for it to finish its tasks, and closes the connection it opened. Closing the app during a retry stops the retries, and `ClientService` waits for its connection to close.

  A startup that fails every attempt no longer causes an unhandled rejection. The error is logged as fatal and the process exits with code 1. Set the new `exitOnStartupFailure` option to `false` to keep the process running. `WorkerService` and `ClientService` now have `ready()` and `getStatus()`, and `startupRetry` sets the number of attempts and the delay between them.

  The class `constructor` is no longer registered as an activity.

  A worker that stops with an error after it started is no longer restarted: the error is logged as fatal and, with `exitOnStartupFailure` on, the process exits so the orchestrator restarts it.
