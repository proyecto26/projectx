/**
 * What a browser can ask a running workflow to do, declared as an object in
 * `defineWorkflow`. Each key is the name of an action, which becomes a function.
 * Your backend decides what it runs, and `kind` says what to expect from it.
 */
export interface WorkflowSignalAction<TInput = void> {
  readonly kind: "signal";
  /** Never set. It only carries the types. */
  readonly types?: { input: TInput };
}

export interface WorkflowUpdateAction<TInput = void, TResult = void> {
  readonly kind: "update";
  /** Never set. It only carries the types. */
  readonly types?: { input: TInput; result: TResult };
}

export type WorkflowActionMap = Readonly<
  Record<
    string,
    {
      readonly kind: "signal" | "update";
      readonly types?: unknown;
    }
  >
>;

/** Resolves when the workflow accepted it, without waiting for it to process it. */
export function signal<TInput = void>(): WorkflowSignalAction<TInput> {
  return { kind: "signal" };
}

/** Resolves with what the workflow answers. */
export function update<TInput = void, TResult = void>(): WorkflowUpdateAction<
  TInput,
  TResult
> {
  return { kind: "update" };
}

export type WorkflowActionInput<TAction> =
  TAction extends WorkflowUpdateAction<infer TInput, infer _TResult>
    ? TInput
    : TAction extends WorkflowSignalAction<infer TInput>
      ? TInput
      : never;

export type WorkflowActionResult<TAction> =
  TAction extends WorkflowUpdateAction<infer _TInput, infer TResult>
    ? TResult
    : void;

export interface WorkflowActionOptions {
  /** Stops waiting. The backend may have received the action already. */
  signal?: AbortSignal;
  /** Repeat it to retry an update without running it twice. */
  actionId?: string;
}

/** The arguments of an action, where the input is optional if it takes none. */
export type WorkflowActionArgs<TInput> = [TInput] extends [void]
  ? [input?: undefined, options?: WorkflowActionOptions]
  : [input: TInput, options?: WorkflowActionOptions];

/** The functions generated from an object of actions. */
export type WorkflowActions<TActions> = [TActions] extends [never]
  ? Record<string, never>
  : {
      readonly [K in keyof TActions]: (
        ...args: WorkflowActionArgs<WorkflowActionInput<TActions[K]>>
      ) => Promise<WorkflowActionResult<TActions[K]>>;
    };
