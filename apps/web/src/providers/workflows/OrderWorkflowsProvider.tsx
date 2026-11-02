import {
  useWorkflow,
  useWorkflowList,
  useWorkflowRegistry,
  WorkflowRegistryProvider,
} from "@proyecto26/temporal-workflow-client/react";
import { type PropsWithChildren, useEffect, useMemo, useRef } from "react";

import { createOrderRegistry } from "./orderRegistry";
import type {
  OrderWorkflowInput,
  OrderWorkflowResult,
  OrderWorkflowState,
} from "./types/order";

type OrderWorkflowsProviderProps = PropsWithChildren<{
  accessToken: string;
  email?: string;
}>;

/** Connects the Temporal workflows of the signed in user to the app. */
export function OrderWorkflowsProvider({
  accessToken,
  email,
  children,
}: OrderWorkflowsProviderProps) {
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const registry = useMemo(
    () =>
      createOrderRegistry({
        email,
        getAccessToken: () => accessTokenRef.current,
      }),
    [email],
  );

  // Remove what the previous version of this store left behind
  useEffect(() => {
    window.localStorage.removeItem("workflows-store");
  }, []);

  return (
    <WorkflowRegistryProvider registry={registry}>
      {children}
    </WorkflowRegistryProvider>
  );
}

/** The workflow of an order, and whether stored orders were restored already. */
export function useOrderWorkflow(referenceId: string) {
  const workflow = useWorkflow<
    OrderWorkflowState,
    OrderWorkflowInput,
    OrderWorkflowResult
  >({ id: referenceId });
  const registry = useWorkflowRegistry<
    OrderWorkflowState,
    OrderWorkflowInput,
    OrderWorkflowResult
  >();
  // Renders again when the registry restores the stored orders
  useWorkflowList();
  return {
    ...workflow,
    isHydrated: registry?.isHydrated ?? false,
    /** Asks the backend for an order that isn't kept in this browser. */
    find: async () => (await registry?.find(referenceId)) ?? "missing",
  };
}
