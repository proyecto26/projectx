import type { WorkflowEvent, WorkflowTransport } from "../types";
import { sleep } from "../utils";

export interface PollingTransportOptions<TState, TInput, TResult> {
  start: WorkflowTransport<TState, TInput, TResult>["start"];
  cancel: WorkflowTransport<TState, TInput, TResult>["cancel"];
  /** Reads the state, usually from an endpoint running a workflow query. */
  getState: (options: { id: string; signal: AbortSignal }) => Promise<TState>;
  intervalMs?: number;
}

/** Works with any backend able to return the state of a workflow. */
export function createPollingTransport<
  TState,
  TInput = unknown,
  TResult = TState,
>({
  start,
  cancel,
  getState,
  intervalMs = 3_000,
}: PollingTransportOptions<TState, TInput, TResult>): WorkflowTransport<
  TState,
  TInput,
  TResult
> {
  return {
    start,
    cancel,
    async *subscribe({ id, signal }): AsyncGenerator<WorkflowEvent<TState>> {
      let last: string | undefined;
      while (!signal.aborted) {
        const state = await getState({ id, signal });
        const serialized = JSON.stringify(state);
        if (serialized !== last) {
          last = serialized;
          yield { type: "state", state };
        }
        await sleep(intervalMs, signal);
      }
    },
  };
}
