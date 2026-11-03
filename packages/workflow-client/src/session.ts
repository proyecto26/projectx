import type { WorkflowActionOptions, WorkflowActions } from "./actions";
import {
  WORKFLOW_NOT_FOUND,
  WorkflowClientError,
  type WorkflowEvent,
  type WorkflowExecutionStatus,
  type WorkflowSessionStatus,
  type WorkflowTransport,
} from "./types";
import { isAbortError, sleep, untilAborted } from "./utils";

export interface WorkflowReconnectOptions {
  initialDelayMs?: number;
  maxDelayMs?: number;
  /** Failed attempts in a row before giving up. Unlimited by default. */
  maxAttempts?: number;
  /** Errors that retrying can't solve. Defaults to 4xx responses. */
  isFatal?: (error: unknown) => boolean;
}

export interface WorkflowSessionSnapshot<TState, TResult = TState> {
  readonly id: string;
  /** The kind of workflow, when it comes from a `WorkflowClient`. */
  readonly type?: string;
  /** The id this workflow was requested with, if the backend decided another. */
  readonly requestedId?: string;
  readonly status: WorkflowSessionStatus;
  /** Last state of the workflow. */
  readonly state?: TState;
  /** Value returned by `transport.start`. */
  readonly result?: TResult;
  readonly error?: Error;
  /** A cancellation was requested and the workflow hasn't finished yet. */
  readonly isCancelling: boolean;
  /** Set when the backend reports how the execution closed. */
  readonly executionStatus?: WorkflowExecutionStatus;
  readonly offset?: number;
  readonly updatedAt: number;
}

export interface WorkflowSessionCallbacks<TState, TResult = TState> {
  onState?: (snapshot: WorkflowSessionSnapshot<TState, TResult>) => void;
  /** Fires when the workflow finishes while the session is following it. */
  onFinish?: (snapshot: WorkflowSessionSnapshot<TState, TResult>) => void;
  onError?: (
    error: Error,
    snapshot: WorkflowSessionSnapshot<TState, TResult>,
  ) => void;
}

export interface WorkflowSessionOptions<
  TState,
  TInput,
  TResult,
  TActions = never,
> extends WorkflowSessionCallbacks<TState, TResult> {
  id: string;
  /** Becomes `session.actions`, one function for each key. */
  actions?: TActions;
  /** The kind of workflow, added to its snapshots. */
  type?: string;
  transport: WorkflowTransport<TState, TInput, TResult>;
  /** Business states that end the session while the execution may still run. */
  isFinal?: (state: TState) => boolean;
  reconnect?: WorkflowReconnectOptions;
  /** Restores a previous session, as the registry does after a reload. */
  initialSnapshot?: Partial<WorkflowSessionSnapshot<TState, TResult>>;
  /** Reads the id decided by the backend from what `transport.start` returned. */
  resolveId?: (result: TResult) => string | undefined;
  /** Used by the registry. Returning false rejects the id decided by the backend. */
  onIdChange?: (id: string, previousId: string) => boolean;
  /** Used by the registry. The session is about to talk to the backend. */
  onActivate?: () => void;
}

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

const isFatalByDefault = (error: unknown) => {
  const { status, code } = error as Partial<WorkflowClientError>;
  if (code === WORKFLOW_NOT_FOUND) return true;
  return (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    status !== 408 &&
    status !== 429
  );
};

/**
 * Follows one workflow. It holds the state outside any UI framework, so hooks
 * and other stores only need to subscribe to it.
 */
export class WorkflowSession<
  TState,
  TInput = unknown,
  TResult = TState,
  TActions = never,
> {
  /**
   * Sends an action to the workflow, such as a signal or an update behind your
   * endpoint. It rejects if the backend refuses it, without changing the status of
   * this session, as the workflow is still running. New state arrives by following
   * it, and the result only goes to the caller. Neither `stop` nor unmounting
   * abort it, and aborting with `signal` doesn't undo what the backend received.
   */
  readonly actions: WorkflowActions<TActions>;
  #id: string;
  #options: WorkflowSessionOptions<TState, TInput, TResult, TActions>;
  #snapshot: WorkflowSessionSnapshot<TState, TResult>;
  #listeners = new Set<() => void>();
  #controller?: AbortController;
  #startPromise?: Promise<void>;
  #startOutcome: Promise<boolean> | undefined;

  constructor(
    options: WorkflowSessionOptions<TState, TInput, TResult, TActions>,
  ) {
    this.actions = Object.fromEntries(
      Object.keys(options.actions ?? {}).map((name) => [
        name,
        (input?: unknown, actionOptions?: WorkflowActionOptions) =>
          this.#send(name, input, actionOptions),
      ]),
    ) as WorkflowActions<TActions>;
    this.#id = options.id;
    this.#options = options;
    this.#snapshot = {
      status: "idle",
      isCancelling: false,
      updatedAt: Date.now(),
      ...options.initialSnapshot,
      id: options.id,
      ...(options.type ? { type: options.type } : {}),
    };
  }

  get id() {
    return this.#id;
  }

  getSnapshot = () => this.#snapshot;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /**
   * Starts the workflow and follows it. Calling it again never starts a second
   * workflow: an active session is left alone and a stopped one is resumed.
   */
  start = (input: TInput): Promise<void> => {
    const { status, result, state } = this.#snapshot;
    if (status === "starting" && this.#startPromise) return this.#startPromise;
    if (status === "running" && this.#controller) return Promise.resolve();
    if (status === "finished") return Promise.resolve();
    if (result !== undefined || state !== undefined) {
      this.resume();
      return Promise.resolve();
    }

    this.#options.onActivate?.();
    const controller = this.#replaceController();
    // Ready before publishing, as a listener can send an action right away
    let started = false;
    let settleOutcome: (isStarted: boolean) => void = () => undefined;
    this.#startOutcome = new Promise((resolve) => {
      settleOutcome = resolve;
    });
    this.#update({ status: "starting", error: undefined });
    const startPromise = this.#options.transport
      .start({ id: this.id, input, signal: controller.signal })
      .then((startResult) => {
        if (controller.signal.aborted) return;
        const id = this.#options.resolveId?.(startResult);
        if (id && id !== this.#id) {
          if (this.#options.onIdChange?.(id, this.#id) === false) {
            this.#fail(
              new Error(`The workflow ${id} is already being followed`),
            );
            return;
          }
          const requestedId = this.#id;
          this.#id = id;
          this.#update({ id, requestedId });
        }
        started = true;
        this.#update({ status: "running", result: startResult });
        void this.#follow(controller);
      })
      .catch((error) => {
        if (!controller.signal.aborted && !isAbortError(error)) {
          this.#fail(error);
        }
      })
      .finally(() => {
        this.#startPromise = undefined;
      });
    this.#startPromise = startPromise;
    void startPromise.then(() => settleOutcome(started));
    return startPromise;
  };

  /** Fills a session that hasn't done anything yet with a stored snapshot. */
  restore = (snapshot: Partial<WorkflowSessionSnapshot<TState, TResult>>) => {
    const { status, state, result } = this.#snapshot;
    if (status !== "idle" || state !== undefined || result !== undefined)
      return;
    const { type } = this.#options;
    this.#update({ ...snapshot, id: this.id, ...(type ? { type } : {}) });
  };

  /** Follows a workflow that is already running in the backend. */
  resume = () => {
    const { status } = this.#snapshot;
    if (status === "finished" || (status === "running" && this.#controller)) {
      return;
    }
    if (status === "starting" && this.#startPromise) return;
    this.#options.onActivate?.();
    const controller = this.#replaceController();
    this.#update({ status: "running", error: undefined });
    void this.#follow(controller);
  };

  /** Requests the cancellation and keeps following until the workflow ends. */
  cancel = async () => {
    if (this.#snapshot.status === "finished" || this.#snapshot.isCancelling) {
      return;
    }
    this.#update({ isCancelling: true });
    try {
      await this.#startPromise;
      await this.#options.transport.cancel({ id: this.id });
      this.resume();
    } catch (error) {
      this.#update({ isCancelling: false });
      if (!isAbortError(error)) {
        this.#options.onError?.(toError(error), this.#snapshot);
      }
      throw error;
    }
  };

  async #send(
    name: string,
    input: unknown,
    options: WorkflowActionOptions = {},
  ) {
    const { transport } = this.#options;
    if (!transport.send) {
      throw new WorkflowClientError("This transport can't send actions");
    }
    // The backend may decide another id, or reject the workflow
    if (this.#snapshot.status === "starting" && this.#startOutcome) {
      if (!(await untilAborted(this.#startOutcome, options.signal))) {
        throw new WorkflowClientError("The workflow didn't start");
      }
    }
    return transport.send({
      id: this.id,
      action: name,
      input,
      actionId: options.actionId ?? globalThis.crypto?.randomUUID?.(),
      signal: options.signal,
    });
  }

  /** Stops listening. The workflow keeps running in the backend. */
  stop = () => {
    this.#controller?.abort();
    this.#controller = undefined;
    const { status } = this.#snapshot;
    if (status === "running" || status === "starting") {
      this.#update({ status: "idle" });
    }
  };

  clearError = () => {
    if (this.#snapshot.error) {
      this.#update({
        error: undefined,
        status:
          this.#snapshot.status === "error" ? "idle" : this.#snapshot.status,
      });
    }
  };

  #replaceController() {
    this.#controller?.abort();
    this.#controller = new AbortController();
    return this.#controller;
  }

  #update(changes: Partial<WorkflowSessionSnapshot<TState, TResult>>) {
    this.#snapshot = { ...this.#snapshot, ...changes, updatedAt: Date.now() };
    for (const listener of this.#listeners) listener();
  }

  #fail(error: unknown) {
    const failure = toError(error);
    this.#controller?.abort();
    this.#controller = undefined;
    this.#update({ status: "error", error: failure, isCancelling: false });
    this.#options.onError?.(failure, this.#snapshot);
  }

  #finish(changes: Partial<WorkflowSessionSnapshot<TState, TResult>>) {
    this.#controller?.abort();
    this.#controller = undefined;
    this.#update({ ...changes, status: "finished", isCancelling: false });
    this.#options.onFinish?.(this.#snapshot);
  }

  /** Applies an event. Returns true when the session has ended. */
  #apply(event: WorkflowEvent<TState>): boolean {
    const offset =
      event.type !== "error" && event.offset !== undefined
        ? { offset: event.offset }
        : {};
    switch (event.type) {
      case "state":
        this.#update({ state: event.state, ...offset });
        this.#options.onState?.(this.#snapshot);
        if (this.#options.isFinal?.(event.state)) {
          this.#finish({});
          return true;
        }
        return false;
      case "finish": {
        const state = event.state === undefined ? {} : { state: event.state };
        this.#finish({ ...state, ...offset, executionStatus: event.status });
        return true;
      }
      case "error":
        this.#fail(
          Object.assign(new Error(event.message), { code: event.code }),
        );
        return true;
    }
  }

  async #follow(controller: AbortController) {
    const {
      initialDelayMs = 1_000,
      maxDelayMs = 30_000,
      maxAttempts = Number.POSITIVE_INFINITY,
      isFatal = isFatalByDefault,
    } = this.#options.reconnect ?? {};
    const { signal } = controller;
    let attempts = 0;

    while (!signal.aborted) {
      try {
        const events = this.#options.transport.subscribe({
          id: this.id,
          fromOffset: this.#snapshot.offset,
          signal,
        });
        for await (const event of events) {
          if (signal.aborted) return;
          attempts = 0;
          if (this.#apply(event)) return;
        }
        // The connection closed before the end, so it counts as a failure
        attempts++;
      } catch (error) {
        if (signal.aborted || isAbortError(error)) return;
        attempts++;
        if (isFatal(error) || attempts >= maxAttempts) {
          this.#fail(error);
          return;
        }
      }
      if (attempts >= maxAttempts) {
        this.#fail(new Error("The connection with the workflow was lost"));
        return;
      }
      const delay = Math.min(initialDelayMs * 2 ** (attempts - 1), maxDelayMs);
      try {
        await sleep(delay, signal);
      } catch {
        return;
      }
    }
  }
}
