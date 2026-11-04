import type {
  WorkflowEvent,
  WorkflowSubscribeOptions,
  WorkflowTransport,
} from "../types";
import { isAbortError } from "../utils";

export interface RetryPrimaryOptions {
  /** Wait before the first try. Doubles after each failed try. 30 s by default. */
  initialDelayMs?: number;
  /** Longest wait between tries. 5 minutes by default. */
  maxDelayMs?: number;
  /**
   * How long a try may wait for its first event before it counts as failed.
   * 10 s by default. The stream must send an event soon after connecting, such
   * as the snapshot from `getState`, or tries will keep timing out.
   */
  timeoutMs?: number;
}

export interface FallbackTransportOptions {
  onFallback?: (error: unknown) => void;
  /**
   * After falling back, try `primary` again from time to time while `secondary`
   * keeps reading, and move back to it on its first event. Off by default.
   */
  retryPrimary?: RetryPrimaryOptions | boolean;
}

type Source = "secondary" | "primary";
type Step<TState> =
  | {
      kind: "next";
      from: Source;
      result: IteratorResult<WorkflowEvent<TState>>;
    }
  | { kind: "error"; from: Source; error: unknown }
  | { kind: "retry" }
  | { kind: "timeout" };

const positive = (value: number | undefined, fallback: number) =>
  value !== undefined && Number.isFinite(value) && value > 0 ? value : fallback;

const settle = <TState>(
  from: Source,
  promise: Promise<IteratorResult<WorkflowEvent<TState>>>,
): Promise<Step<TState>> =>
  promise.then(
    (result) => ({ kind: "next", from, result }),
    (error: unknown) => ({ kind: "error", from, error }),
  );

function timer<K extends "retry" | "timeout">(ms: number, kind: K) {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<{ kind: typeof kind }>((resolve) => {
    handle = setTimeout(() => resolve({ kind }), ms);
  });
  return { promise, clear: () => clearTimeout(handle) };
}

/** Opens a source with its own signal, also aborted by the subscriber's. */
function open<TState>(
  transport: {
    subscribe(
      options: WorkflowSubscribeOptions,
    ): AsyncIterable<WorkflowEvent<TState>>;
  },
  options: WorkflowSubscribeOptions,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal.addEventListener("abort", abort, { once: true });
  const iterator = transport
    .subscribe({ ...options, signal: controller.signal })
    [Symbol.asyncIterator]();
  return {
    iterator,
    close() {
      options.signal.removeEventListener("abort", abort);
      controller.abort();
      // Its pending read rejects with the abort, and nobody waits for it
      iterator.return?.().catch(() => undefined);
    },
  };
}

/**
 * Reads from `primary` and moves to `secondary` if it fails before sending
 * anything, for example behind a proxy without streaming. A failure after that
 * is left to the session, which reconnects to `primary`. With `retryPrimary`,
 * it tries `primary` again while `secondary` reads, after a transient outage.
 */
export function createFallbackTransport<
  TState,
  TInput = unknown,
  TResult = TState,
>(
  primary: WorkflowTransport<TState, TInput, TResult>,
  secondary: WorkflowTransport<TState, TInput, TResult>,
  options: FallbackTransportOptions = {},
): WorkflowTransport<TState, TInput, TResult> {
  const retry =
    options.retryPrimary === true ? {} : options.retryPrimary || undefined;
  const maxDelayMs = positive(retry?.maxDelayMs, 300_000);
  const initialDelayMs = Math.min(
    positive(retry?.initialDelayMs, 30_000),
    maxDelayMs,
  );
  const timeoutMs = positive(retry?.timeoutMs, 10_000);

  /** Reads `secondary`, trying `primary` alongside it until one of them ends. */
  async function* recover(
    subscribeOptions: WorkflowSubscribeOptions,
  ): AsyncGenerator<WorkflowEvent<TState>> {
    const reading = open(secondary, {
      ...subscribeOptions,
      fromOffset: undefined,
    });
    let readNext = settle<TState>("secondary", reading.iterator.next());
    let delay = initialDelayMs;
    let wait = timer(delay, "retry");
    type Opened = ReturnType<typeof open<TState>>;
    let attempt: { source: Opened; next: Promise<Step<TState>> } | undefined;
    let current: Opened | undefined;
    let deadline: ReturnType<typeof timer> | undefined;

    const dropAttempt = () => {
      attempt?.source.close();
      attempt = undefined;
      deadline?.clear();
      deadline = undefined;
      delay = Math.min(delay * 2, maxDelayMs);
      wait = timer(delay, "retry");
    };

    try {
      while (!subscribeOptions.signal.aborted) {
        const step = await Promise.race<Step<TState>>([
          readNext,
          attempt ? attempt.next : wait.promise,
          ...(deadline ? [deadline.promise] : []),
        ]);
        if (subscribeOptions.signal.aborted) return;

        if (step.kind === "retry") {
          const source = open(primary, subscribeOptions);
          attempt = { source, next: settle("primary", source.iterator.next()) };
          deadline = timer(timeoutMs, "timeout");
        } else if (step.kind === "timeout") {
          dropAttempt();
        } else if (step.from === "secondary") {
          if (step.kind === "error") throw step.error;
          if (step.result.done) return;
          yield step.result.value;
          readNext = settle("secondary", reading.iterator.next());
        } else if (step.kind === "error" || step.result.done) {
          // It failed or closed before sending anything, so polling goes on
          dropAttempt();
        } else {
          // The stream is back: stop reading the secondary and stay on it
          current = (attempt as NonNullable<typeof attempt>).source;
          attempt = undefined;
          deadline?.clear();
          deadline = undefined;
          reading.close();
          yield step.result.value;
          while (true) {
            const next = await current.iterator.next();
            if (next.done) return;
            yield next.value;
          }
        }
      }
    } finally {
      wait.clear();
      deadline?.clear();
      attempt?.source.close();
      current?.close();
      reading.close();
    }
  }

  return {
    start: primary.start,
    cancel: primary.cancel,
    send: primary.send?.bind(primary),
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
      if (!retry) {
        yield* secondary.subscribe({
          ...subscribeOptions,
          fromOffset: undefined,
        });
        return;
      }
      yield* recover(subscribeOptions);
    },
  };
}
