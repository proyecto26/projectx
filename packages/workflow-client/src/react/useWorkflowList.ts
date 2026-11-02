"use client";

import { useEffect, useState } from "react";

import type { WorkflowRegistry } from "../registry";
import { useWorkflowRegistry } from "./context";

/** Snapshots of all the workflows in a registry. */
export function useWorkflowList<TState, TInput = unknown, TResult = TState>(
  registry?: WorkflowRegistry<TState, TInput, TResult>,
) {
  const contextRegistry = useWorkflowRegistry<TState, TInput, TResult>();
  const current = registry ?? contextRegistry;
  const [list, setList] = useState(() => current?.list() ?? []);

  useEffect(() => {
    if (!current) return;
    const publish = () => setList(current.list());
    const unsubscribe = current.subscribe(publish);
    publish();
    return unsubscribe;
  }, [current]);

  return list;
}
