import type {
  SignalDefinition,
  UpdateDefinition,
  WorkflowHandle,
} from "@temporalio/client";

import type {
  WorkflowActionMap,
  WorkflowSignalAction,
  WorkflowUpdateAction,
} from "../actions";
import { WORKFLOW_NOT_FOUND } from "../types";

export const WORKFLOW_ACTION_UNKNOWN = "unknown_action";
export const WORKFLOW_ACTION_REJECTED = "rejected";
export const WORKFLOW_ACTION_OUTCOME_UNKNOWN = "outcome_unknown";

type RunAction = (options: {
  handle: WorkflowHandle;
  input: unknown;
  actionId?: string;
}) => Promise<unknown>;

export interface ServerSignalAction<TInput = void> {
  readonly kind: "signal";
  readonly run: RunAction;
  /**
   * Never set. A function, so a handler must accept everything the frontend can
   * send, while it may accept more.
   */
  readonly accepts?: (input: TInput) => void;
}

export interface ServerUpdateAction<TInput = void, TResult = void> {
  readonly kind: "update";
  readonly run: RunAction;
  /** Never set. See `ServerSignalAction`. */
  readonly accepts?: (input: TInput) => void;
  /** Never set. The frontend can rely on what the handler returns. */
  readonly returns?: TResult;
}

/** A workflow handler takes one input at most, as a browser sends one. */
type InputOf<TArgs extends unknown[]> = TArgs extends [infer TInput]
  ? TInput
  : void;

/** Answers with a 202 as soon as Temporal accepts the signal. */
export function signalAction<TArgs extends [unknown] | []>(
  definition: SignalDefinition<TArgs>,
): ServerSignalAction<InputOf<TArgs>> {
  return {
    kind: "signal",
    run: async ({ handle, input }) => {
      if (input === undefined) await handle.signal<[]>(definition.name);
      else await handle.signal<[unknown]>(definition.name, input);
      return undefined;
    },
  };
}

/**
 * Waits for the result of the update. A repeated `actionId` doesn't run it again
 * in the same workflow run, and returns the first result, so keep the same action
 * and input when retrying with one.
 */
export function updateAction<TResult, TArgs extends [unknown] | []>(
  definition: UpdateDefinition<TResult, TArgs>,
): ServerUpdateAction<InputOf<TArgs>, TResult> {
  return {
    kind: "update",
    run: ({ handle, input, actionId }) => {
      const options = actionId ? { updateId: actionId } : {};
      return input === undefined
        ? handle.executeUpdate<unknown, []>(definition.name, options)
        : handle.executeUpdate<unknown, [unknown]>(definition.name, {
            ...options,
            args: [input],
          });
    },
  };
}

/** One implementation for each action, matching its kind, input and result. */
export type ServerActions<TActions> = {
  readonly [K in keyof TActions]: TActions[K] extends WorkflowUpdateAction<
    infer TInput,
    infer TResult
  >
    ? ServerUpdateAction<TInput, TResult>
    : TActions[K] extends WorkflowSignalAction<infer TInput>
      ? ServerSignalAction<TInput>
      : never;
};

const failure = (status: number, code: string, message: string) =>
  Response.json({ code, message }, { status });

// By name, so importing this module doesn't require @temporalio/client
const isNamed = (error: unknown, name: string) =>
  error instanceof Error && error.name === name;

/**
 * Implements the actions of a workflow, using the same object as `defineWorkflow`.
 * Only these names reach Temporal, and it throws if one is missing, unknown, or
 * of another kind, for JavaScript as well.
 */
export function defineServerActions<TActions extends WorkflowActionMap>(
  contract: TActions,
  actions: ServerActions<TActions>,
) {
  const implementations = actions as Readonly<
    Record<string, { kind: string; run: RunAction }>
  >;
  for (const name of new Set([
    ...Object.keys(contract),
    ...Object.keys(implementations),
  ])) {
    const expected = Object.hasOwn(contract, name)
      ? contract[name]?.kind
      : undefined;
    const actual = Object.hasOwn(implementations, name)
      ? implementations[name]?.kind
      : undefined;
    if (expected !== actual) {
      throw new Error(
        `The action "${name}" is declared as ${expected ?? "nothing"} but implemented as ${actual ?? "nothing"}`,
      );
    }
  }

  return {
    /**
     * Runs an action and answers with a web `Response`. Check first that the user
     * owns the workflow, and validate `input`, because it comes from the browser.
     * The message of an `ApplicationFailure` thrown by the workflow reaches the
     * browser, while other failures stay on the server.
     */
    async handle({
      handle,
      name,
      input,
      actionId,
    }: {
      handle: WorkflowHandle;
      name: string;
      input?: unknown;
      actionId?: string;
    }): Promise<Response> {
      // Names like "constructor" come from the URL and aren't actions
      const action = Object.hasOwn(implementations, name)
        ? implementations[name]
        : undefined;
      if (!action) {
        return failure(404, WORKFLOW_ACTION_UNKNOWN, "Unknown action");
      }
      let result: unknown;
      try {
        result = await action.run({ handle, input, actionId });
      } catch (error) {
        if (isNamed(error, "WorkflowNotFoundError")) {
          return failure(404, WORKFLOW_NOT_FOUND, "Workflow not found");
        }
        if (isNamed(error, "WorkflowUpdateFailedError")) {
          const { cause } = error as Error;
          return failure(
            422,
            WORKFLOW_ACTION_REJECTED,
            isNamed(cause, "ApplicationFailure")
              ? (cause as Error).message
              : "The workflow rejected the action",
          );
        }
        if (isNamed(error, "WorkflowUpdateRPCTimeoutOrCancelledError")) {
          return failure(
            504,
            WORKFLOW_ACTION_OUTCOME_UNKNOWN,
            "The workflow didn't answer in time. The action may still run",
          );
        }
        throw error;
      }
      return result === undefined
        ? new Response(null, { status: 202 })
        : Response.json(result);
    },
  };
}
