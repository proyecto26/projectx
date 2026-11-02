/** Lifecycle of a workflow as seen by this client. */
export type WorkflowSessionStatus =
  | "idle"
  | "starting"
  | "running"
  | "finished"
  | "error";

/** Status reported by Temporal once the execution closes. */
export type WorkflowExecutionStatus =
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TERMINATED"
  | "CONTINUED_AS_NEW"
  | "TIMED_OUT"
  | "PAUSED"
  | "UNKNOWN"
  | "UNSPECIFIED";

/**
 * What a backend sends about a workflow.
 * `offset` is the position to resume from after a disconnection.
 */
export type WorkflowEvent<TState> =
  | { type: "state"; state: TState; offset?: number }
  | {
      type: "finish";
      state?: TState;
      status?: WorkflowExecutionStatus;
      offset?: number;
    }
  | { type: "error"; message: string; code?: string };

export interface WorkflowStartOptions<TInput> {
  id: string;
  input: TInput;
  signal: AbortSignal;
}

export interface WorkflowSubscribeOptions {
  id: string;
  fromOffset?: number;
  signal: AbortSignal;
}

export interface WorkflowCancelOptions {
  id: string;
  signal?: AbortSignal;
}

/**
 * How a client talks to a backend. Replace it to use another protocol, such as
 * WebSockets, or to call your API with its own client.
 */
export interface WorkflowTransport<TState, TInput = unknown, TResult = TState> {
  /** Starts the workflow. The backend must reject or ignore a repeated id. */
  start(options: WorkflowStartOptions<TInput>): Promise<TResult>;
  /** Reads what happens to the workflow until the signal aborts or it ends. */
  subscribe(
    options: WorkflowSubscribeOptions,
  ): AsyncIterable<WorkflowEvent<TState>>;
  /** Requests the cancellation. The result arrives through `subscribe`. */
  cancel(options: WorkflowCancelOptions): Promise<void>;
}

/** Thrown by transports and sessions. `status` holds the HTTP status if any. */
export class WorkflowClientError extends Error {
  readonly status?: number;
  readonly code?: string;

  constructor(
    message: string,
    options: { status?: number; code?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "WorkflowClientError";
    this.status = options.status;
    this.code = options.code;
  }
}

export const WORKFLOW_NOT_FOUND = "not_found";
