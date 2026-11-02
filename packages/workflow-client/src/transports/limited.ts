import type { WorkflowTransport } from "../types";

export interface LimitedTransportOptions {
  /**
   * Streams open at once. Browsers allow about 6 connections per origin over
   * HTTP/1.1 and open streams hold them, which blocks any other request to that
   * API. Keep it below that limit. It counts this registry only, not other tabs.
   */
  maxStreams?: number;
}

const DEFAULT_MAX_STREAMS = 4;

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
  { maxStreams = DEFAULT_MAX_STREAMS }: LimitedTransportOptions = {},
): WorkflowTransport<TState, TInput, TResult> {
  let streams = 0;
  const waiting = new Set<() => void>();

  return {
    start: (options) => primary.start(options),
    cancel: (options) => primary.cancel(options),

    async *subscribe({ id, fromOffset, signal }) {
      if (streams < maxStreams) {
        streams++;
        // Freed as soon as it aborts, as the next subscriber can come right after
        let isReleased = false;
        const release = () => {
          if (isReleased) return;
          isReleased = true;
          streams--;
          const [next] = waiting;
          next?.();
        };
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
        waiting.delete(stopSecondary);
        secondarySignal.abort();
      };
      signal.addEventListener("abort", stopSecondary);
      waiting.add(stopSecondary);
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
        waiting.delete(stopSecondary);
        signal.removeEventListener("abort", stopSecondary);
      }
    },
  };
}
