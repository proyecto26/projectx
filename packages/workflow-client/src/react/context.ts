"use client";

import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
} from "react";

import type { WorkflowClient } from "../client";

const WorkflowClientContext = createContext<WorkflowClient<never> | undefined>(
  undefined,
);

/** Shares a client, following its workflows while this is mounted. */
export function WorkflowClientProvider<TContext>({
  client,
  children,
}: {
  client: WorkflowClient<TContext>;
  children?: ReactNode;
}) {
  useEffect(() => {
    client.hydrate();
    return () => client.stop();
  }, [client]);

  return createElement(
    WorkflowClientContext.Provider,
    { value: client as unknown as WorkflowClient<never> },
    children,
  );
}

export function useWorkflowClient() {
  return useContext(WorkflowClientContext);
}
