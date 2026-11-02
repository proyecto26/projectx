import type { Client, WorkflowHandle } from "@temporalio/client";

import {
  WORKFLOW_NOT_FOUND,
  type WorkflowEvent,
  type WorkflowExecutionStatus,
} from "../types";
import { abortError, isAbortError, sleep } from "../utils";

const STREAM_OFFSET_QUERY = "__temporal_workflow_stream_offset";

export interface QueryPollingEventsOptions<TState> {
  handle: WorkflowHandle;
  /** Reads the current state, usually with a workflow query. */
  getState: (handle: WorkflowHandle) => Promise<TState>;
  intervalMs?: number;
  signal?: AbortSignal;
}

export interface WorkflowStreamEventsOptions<TState>
  extends Omit<QueryPollingEventsOptions<TState>, "handle" | "getState"> {
  client: Client;
  workflowId: string;
  /** Topic the workflow publishes to. */
  topic?: string;
  /**
   * Reads the current state. When present, each published item is treated as a
   * full state: a connection gets this snapshot and the items after it. Without
   * it, a connection gets the log from `fromOffset`, for topics with deltas.
   */
  getState?: (handle: WorkflowHandle) => Promise<TState>;
  fromOffset?: number;
}

// By name, so importing this module doesn't require @temporalio/client
const isNamed = (error: unknown, name: string) =>
  error instanceof Error && error.name === name;

const isRunning = (status: WorkflowExecutionStatus) => status === "RUNNING";

async function describeStatus(handle: WorkflowHandle) {
  const { status } = await handle.describe();
  return status.name as WorkflowExecutionStatus;
}

async function* closeWith<TState>(
  handle: WorkflowHandle,
  getState: ((handle: WorkflowHandle) => Promise<TState>) | undefined,
  status: WorkflowExecutionStatus,
  offset?: number,
): AsyncGenerator<WorkflowEvent<TState>> {
  const state = getState ? await getState(handle) : undefined;
  yield {
    type: "finish",
    status,
    ...(state === undefined ? {} : { state }),
    ...(offset === undefined ? {} : { offset }),
  };
}

/**
 * Events from querying a workflow on an interval. It needs nothing from the
 * workflow, which suits executions that don't publish to a stream.
 */
export async function* queryPollingEvents<TState>({
  handle,
  getState,
  intervalMs = 2_000,
  signal,
}: QueryPollingEventsOptions<TState>): AsyncGenerator<WorkflowEvent<TState>> {
  let last: string | undefined;
  while (!signal?.aborted) {
    const status = await describeStatus(handle);
    if (!isRunning(status)) {
      yield* closeWith(handle, getState, status);
      return;
    }
    const state = await getState(handle);
    const serialized = JSON.stringify(state);
    if (serialized !== last) {
      last = serialized;
      yield { type: "state", state };
    }
    try {
      await sleep(intervalMs, signal);
    } catch (error) {
      if (isAbortError(error)) return;
      throw error;
    }
  }
}

/** Resolves with the next value or rejects if the signal aborts first. */
function untilAborted<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      promise.catch(() => undefined);
      reject(abortError());
      return;
    }
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

/**
 * Events of a workflow using `@temporalio/workflow-streams`. It ends with a
 * `finish` event holding the final state, because an item published right before
 * a workflow closes can be missed by a subscriber. A running workflow that
 * doesn't publish to a stream is followed by querying it instead.
 */
export async function* workflowStreamEvents<TState>({
  client,
  workflowId,
  topic = "state",
  getState,
  fromOffset,
  intervalMs,
  signal,
}: WorkflowStreamEventsOptions<TState>): AsyncGenerator<WorkflowEvent<TState>> {
  const handle = client.workflow.getHandle(workflowId);
  let status: WorkflowExecutionStatus;
  try {
    status = await describeStatus(handle);
  } catch (error) {
    if (isNamed(error, "WorkflowNotFoundError")) {
      yield {
        type: "error",
        message: "Workflow not found",
        code: WORKFLOW_NOT_FOUND,
      };
      return;
    }
    throw error;
  }
  if (!isRunning(status)) {
    yield* closeWith(handle, getState, status);
    return;
  }

  let offset = fromOffset ?? 0;
  if (getState) {
    // Read the position first: anything published after it is sent afterwards,
    // so the state can't go back to a value older than the snapshot.
    try {
      offset = await handle.query<number>(STREAM_OFFSET_QUERY);
    } catch (error) {
      if (!isNamed(error, "QueryNotRegisteredError")) throw error;
      yield* queryPollingEvents({ handle, getState, intervalMs, signal });
      return;
    }
    yield { type: "state", state: await getState(handle), offset };
  }

  const { WorkflowStreamClient } = await import(
    "@temporalio/workflow-streams/client"
  );
  const items = WorkflowStreamClient.create(client, workflowId)
    .topic<TState>(topic)
    .subscribe(offset)
    [Symbol.asyncIterator]();
  try {
    while (true) {
      const { done, value } = await untilAborted(items.next(), signal);
      if (done) break;
      offset = value.offset + 1;
      yield { type: "state", state: value.data, offset };
    }
  } catch (error) {
    if (isAbortError(error)) return;
    throw error;
  } finally {
    // A poll may be waiting for items, so returning can take long
    void items.return?.(undefined)?.catch?.(() => undefined);
  }

  yield* closeWith(handle, getState, await describeStatus(handle), offset);
}
