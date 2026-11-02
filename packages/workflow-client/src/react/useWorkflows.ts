"use client";

import { useMemo } from "react";

import type { WorkflowRegistry } from "../registry";
import type { WorkflowSessionSnapshot } from "../session";
import { useWorkflowList } from "./useWorkflowList";

export interface UseWorkflowsOptions<TState, TInput, TResult, TCombined> {
  /** The workflows to read, in this order. Defaults to all of the registry. */
  ids?: ReadonlyArray<string>;
  registry?: WorkflowRegistry<TState, TInput, TResult>;
  /**
   * Derives a value from the workflows. Keep it stable with `useCallback` or out
   * of the component if the reference of the value matters.
   */
  combine?: (
    workflows: ReadonlyArray<WorkflowSessionSnapshot<TState, TResult>>,
  ) => TCombined;
}

/** Reads several workflows of a registry at once, as `useQueries` does. */
export function useWorkflows<
  TState,
  TInput = unknown,
  TResult = TState,
  TCombined = ReadonlyArray<WorkflowSessionSnapshot<TState, TResult>>,
>({
  ids,
  registry,
  combine,
}: UseWorkflowsOptions<TState, TInput, TResult, TCombined> = {}): TCombined {
  const list = useWorkflowList<TState, TInput, TResult>(registry);
  const idsKey = ids ? JSON.stringify(ids) : undefined;

  // biome-ignore lint/correctness/useExhaustiveDependencies: idsKey stands for ids
  return useMemo(() => {
    const workflows = ids
      ? ids.flatMap(
          (id) => list.find((w) => w.id === id || w.requestedId === id) ?? [],
        )
      : list;
    return (combine ? combine(workflows) : workflows) as TCombined;
  }, [list, idsKey, combine]);
}
