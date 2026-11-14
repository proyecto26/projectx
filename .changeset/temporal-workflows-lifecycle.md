---
"@proyecto26/temporal-workflows": patch
---

Shuts the worker down when the app closes. `WorkerService` used to keep the worker only after it stopped, so `onModuleDestroy` never shut it down, and it left a connection open for every failed attempt. It now shuts the worker down, waits for it to finish its tasks, and closes the connection it opened. Closing the app during a retry stops the retries, and `ClientService` waits for its connection to close.

A startup that fails every attempt no longer causes an unhandled rejection. The error is logged as fatal and the process exits with code 1. Set the new `exitOnStartupFailure` option to `false` to keep the process running. `WorkerService` and `ClientService` now have `ready()` and `getStatus()`, and `startupRetry` sets the number of attempts and the delay between them.

The class `constructor` is no longer registered as an activity.

A worker that stops with an error after it started is no longer restarted: the error is logged as fatal and, with `exitOnStartupFailure` on, the process exits so the orchestrator restarts it.
