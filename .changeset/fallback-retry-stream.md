---
"@proyecto26/temporal-workflow-client": minor
---

`createFallbackTransport` can try the stream again after falling back, with `retryPrimary`. Polling goes on during each try, and the transport moves back to the stream on its first event. It's off by default. The README now puts `createLimitedTransport` inside the fallback, so a stream that fails gives its slot back while it polls.
