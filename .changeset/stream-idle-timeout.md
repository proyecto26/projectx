---
"@proyecto26/temporal-workflow-client": minor
---

`createHttpStreamTransport` fails a stream that sends nothing for `idleTimeoutMs`, 45 s by default, keep-alive comments included, so the session reconnects from the last offset instead of waiting forever. The error has the code `STREAM_IDLE` and isn't fatal. Set `idleTimeoutMs: 0` to turn it off. A server that sends nothing for longer than the timeout, such as one without keep-alives, now gets reconnects.
