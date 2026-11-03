import type { WorkflowTransport } from "../types";

const DEFAULT_MAX_STREAMS = 4;

/** Counts open streams, so transports of different workflows can share a limit. */
export interface StreamLimiter {
  /** Takes a stream if there is one free, returning how to give it back. */
  acquire(): (() => void) | undefined;
  /** Calls the listener when a stream is free. Returns how to stop waiting. */
  wait(listener: () => void): () => void;
}

export function createStreamLimiter({
  maxStreams = DEFAULT_MAX_STREAMS,
}: {
  maxStreams?: number;
} = {}): StreamLimiter {
  let streams = 0;
  const waiting = new Set<() => void>();
  return {
    acquire() {
      if (streams >= maxStreams) return undefined;
      streams++;
      let isReleased = false;
      return () => {
        if (isReleased) return;
        isReleased = true;
        streams--;
        const [next] = waiting;
        next?.();
      };
    },
    wait(listener) {
      waiting.add(listener);
      return () => {
        waiting.delete(listener);
      };
    },
  };
}

export interface LimitedTransportOptions {
  /**
   * Streams open at once. Browsers allow about 6 connections per origin over
   * HTTP/1.1 and open streams hold them, which blocks any other request to that
   * API. Keep it below that limit. It counts this transport only, not other tabs.
   */
  maxStreams?: number;
  /** Shares the count with other transports. Replaces `maxStreams`. */
  limiter?: StreamLimiter;
}

/**
 * Follows the workflows above the limit with `secondary`, usually polling. Each
 * of them moves to `primary` when a stream ends, as the session reconnects.
 * Streams and starts always go through `primary`.
 */
export function createLimitedTransport<
  TState,
  TInput = unknown,
  TResult = TState,
>(
  primary: WorkflowTransport<TState, TInput, TResult>,
  secondary: WorkflowTransport<TState, TInput, TResult>,
  {
    maxStreams,
    limiter = createStreamLimiter({ maxStreams }),
  }: LimitedTransportOptions = {},
): WorkflowTransport<TState, TInput, TResult> {
  return {
    start: (options) => primary.start(options),
    cancel: (options) => primary.cancel(options),
    send: primary.send?.bind(primary),

    async *subscribe({ id, fromOffset, signal }) {
      // Freed as soon as it aborts, as the next subscriber can come right after
      const release = limiter.acquire();
      if (release) {
        signal.addEventListener("abort", release);
        try {
          yield* primary.subscribe({ id, fromOffset, signal });
        } finally {
          signal.removeEventListener("abort", release);
          release();
        }
        return;
      }

      const secondarySignal = new AbortController();
      const stopSecondary = () => {
        stopWaiting();
        secondarySignal.abort();
      };
      const stopWaiting = limiter.wait(stopSecondary);
      signal.addEventListener("abort", stopSecondary);
      try {
        yield* secondary.subscribe({
          id,
          fromOffset,
          signal: secondarySignal.signal,
        });
      } catch (error) {
        if (signal.aborted || !secondarySignal.signal.aborted) throw error;
        // A stream is free, and ending here makes the session reconnect
      } finally {
        stopWaiting();
        signal.removeEventListener("abort", stopSecondary);
      }
    },
  };
}
