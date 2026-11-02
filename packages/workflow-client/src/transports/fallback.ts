import type { WorkflowEvent, WorkflowTransport } from "../types";
import { isAbortError } from "../utils";

/**
 * Reads from `primary` and moves to `secondary` if it fails before sending
 * anything, for example behind a proxy without streaming. A failure after that
 * is left to the session, which reconnects to `primary`.
 */
export function createFallbackTransport<
  TState,
  TInput = unknown,
  TResult = TState,
>(
  primary: WorkflowTransport<TState, TInput, TResult>,
  secondary: WorkflowTransport<TState, TInput, TResult>,
  options: { onFallback?: (error: unknown) => void } = {},
): WorkflowTransport<TState, TInput, TResult> {
  return {
    start: primary.start,
    cancel: primary.cancel,
    async *subscribe(subscribeOptions): AsyncGenerator<WorkflowEvent<TState>> {
      let received = false;
      try {
        for await (const event of primary.subscribe(subscribeOptions)) {
          received = true;
          yield event;
        }
        return;
      } catch (error) {
        if (
          received ||
          subscribeOptions.signal.aborted ||
          isAbortError(error)
        ) {
          throw error;
        }
        options.onFallback?.(error);
      }
      yield* secondary.subscribe({
        ...subscribeOptions,
        fromOffset: undefined,
      });
    },
  };
}
