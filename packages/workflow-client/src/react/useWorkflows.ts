"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  WorkflowClient,
  WorkflowDefinitionOf,
  WorkflowSnapshot,
} from "../client";
import { useWorkflowClient } from "./context";

interface UseWorkflowsBaseOptions<TSnapshot, TCombined> {
  /** The workflows to read, in this order. Defaults to all of them. */
  ids?: ReadonlyArray<string>;
  /** Defaults to the client of `WorkflowClientProvider`. */
  client?: WorkflowClient<never>;
  /**
   * Derives a value from the workflows. Keep it stable with `useCallback` or out
   * of the component if the reference of the value matters.
   */
  combine?: (workflows: ReadonlyArray<TSnapshot>) => TCombined;
}

/** Reads the workflows of a kind at once, as `useQueries` does. */
export function useWorkflows<
  TState,
  TInput = unknown,
  TResult = TState,
  TCombined = ReadonlyArray<WorkflowSnapshot<TState, TResult>>,
  TActions = never,
>(
  options: UseWorkflowsBaseOptions<
    WorkflowSnapshot<TState, TResult>,
    TCombined
  > & { workflow: WorkflowDefinitionOf<TState, TInput, TResult, TActions> },
): TCombined;
/** Reads the workflows of every kind, each one with its `type`. */
export function useWorkflows<TCombined = ReadonlyArray<WorkflowSnapshot>>(
  options?: UseWorkflowsBaseOptions<WorkflowSnapshot, TCombined> & {
    /** Only the workflows of this type. */
    type?: string;
  },
): TCombined;
export function useWorkflows({
  workflow,
  type = workflow?.type,
  ids,
  client,
  combine,
}: UseWorkflowsBaseOptions<WorkflowSnapshot, unknown> & {
  workflow?: { type: string };
  type?: string;
} = {}) {
  const contextClient = useWorkflowClient();
  const current = client ?? contextClient;
  const [list, setList] = useState(() => current?.list() ?? []);

  useEffect(() => {
    if (!current) return;
    const publish = () => setList(current.list());
    const unsubscribe = current.subscribe(publish);
    publish();
    return unsubscribe;
  }, [current]);

  const idsKey = ids ? JSON.stringify(ids) : undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: idsKey stands for ids
  return useMemo(() => {
    const ofType = type ? list.filter((w) => w.type === type) : list;
    const workflows = ids
      ? ids.flatMap(
          (id) => ofType.find((w) => w.id === id || w.requestedId === id) ?? [],
        )
      : ofType;
    return combine ? combine(workflows) : workflows;
  }, [list, type, idsKey, combine]);
}
