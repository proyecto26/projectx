"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
} from "react";

import type { WorkflowRegistry } from "../registry";

// biome-ignore lint/suspicious/noExplicitAny: Each hook call narrows the types
type AnyRegistry = WorkflowRegistry<any, any, any>;

const WorkflowRegistryContext = createContext<AnyRegistry | undefined>(
  undefined,
);

/** Shares a registry, following its workflows while this is mounted. */
export function WorkflowRegistryProvider({
  registry,
  children,
}: {
  registry: AnyRegistry;
  children?: ReactNode;
}) {
  useEffect(() => {
    registry.hydrate();
    return () => registry.stop();
  }, [registry]);

  return createElement(
    WorkflowRegistryContext.Provider,
    { value: registry },
    children,
  );
}

export function useWorkflowRegistry<
  TState,
  TInput = unknown,
  TResult = TState,
>() {
  return useContext(WorkflowRegistryContext) as
    | WorkflowRegistry<TState, TInput, TResult>
    | undefined;
}
