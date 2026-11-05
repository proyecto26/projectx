# @proyecto26/temporal-workflow-client

## 0.2.0

### Minor Changes

- [#29](https://github.com/proyecto26/projectx/pull/29) [`5838b48`](https://github.com/proyecto26/projectx/commit/5838b48128230add9f9c2ae5560110f35a67cc6a) Thanks [@jdnichollsc](https://github.com/jdnichollsc)! - `createFallbackTransport` can try the stream again after falling back, with `retryPrimary`. Polling goes on during each try, and the transport moves back to the stream on its first event. It's off by default. The README now puts `createLimitedTransport` inside the fallback, so a stream that fails gives its slot back while it polls.

- [#31](https://github.com/proyecto26/projectx/pull/31) [`7898de5`](https://github.com/proyecto26/projectx/commit/7898de53c7c687a8e7a6e49970b5deba157ef5ed) Thanks [@jdnichollsc](https://github.com/jdnichollsc)! - `createHttpStreamTransport` fails a stream that sends nothing for `idleTimeoutMs`, 45 s by default, keep-alive comments included, so the session reconnects from the last offset instead of waiting forever. The error has the code `STREAM_IDLE` and isn't fatal. Set `idleTimeoutMs: 0` to turn it off. A server that sends nothing for longer than the timeout, such as one without keep-alives, now gets reconnects.
