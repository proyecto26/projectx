"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  WorkflowActionArgs,
  WorkflowActionInput,
  WorkflowActionMap,
  WorkflowActionResult,
} from "../actions";
import type { WorkflowClient, WorkflowDefinitionOf } from "../client";
import { useWorkflowClient } from "./context";

interface ActionState<TResult> {
  isPending: boolean;
  result?: TResult;
  error?: Error;
}

/**
 * Sends one action and tracks its last call, for pending buttons and messages.
 * `send` puts failures in `error` and resolves with `undefined`, so it's safe in an
 * event handler. Use `actions` from `useWorkflow` to handle a rejection yourself.
 */
export function useWorkflowAction<
  TState,
  TInput,
  TResult,
  TActions extends WorkflowActionMap,
  TName extends keyof TActions & string,
>({
  workflow,
  id,
  action,
  client,
}: {
  workflow: WorkflowDefinitionOf<TState, TInput, TResult, TActions>;
  id: string;
  /** The name of an action of this workflow. */
  action: TName;
  /** Defaults to the client of `WorkflowClientProvider`. */
  client?: WorkflowClient<never>;
}) {
  type Input = WorkflowActionInput<TActions[TName]>;
  type Output = WorkflowActionResult<TActions[TName]>;
  const contextClient = useWorkflowClient();
  const current = client ?? contextClient;
  if (!current) {
    throw new Error(
      "useWorkflowAction needs a client from WorkflowClientProvider",
    );
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: the type identifies the definition
  const session = useMemo(
    () => current.session(workflow, id),
    [current, workflow.type, id],
  );
  const [state, setState] = useState<ActionState<Output>>({
    isPending: false,
  });
  // Only the last call updates the state, while earlier ones still run
  const lastCall = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: starts over for another target
  useEffect(() => {
    lastCall.current++;
    setState({ isPending: false });
  }, [session, action]);

  const send = useCallback(
    async (...args: WorkflowActionArgs<Input>): Promise<Output | undefined> => {
      const call = ++lastCall.current;
      setState({ isPending: true });
      try {
        const run = session.actions[action] as unknown as (
          ...runArgs: WorkflowActionArgs<Input>
        ) => Promise<Output>;
        const result = await run(...args);
        if (call === lastCall.current) setState({ isPending: false, result });
        return result;
      } catch (error) {
        if (call === lastCall.current) {
          setState({
            isPending: false,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
        return undefined;
      }
    },
    [session, action],
  );

  return { ...state, send };
}
