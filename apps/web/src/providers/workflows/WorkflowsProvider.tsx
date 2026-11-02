import { canUseDOM } from "@projectx/ui";
import { WorkflowClient } from "@proyecto26/temporal-workflow-client";
import {
  useWorkflow,
  useWorkflowClient,
  useWorkflows,
  WorkflowClientProvider,
} from "@proyecto26/temporal-workflow-client/react";
import { type PropsWithChildren, useEffect, useMemo, useRef } from "react";

import { orderWorkflow, type WorkflowsContext } from "./orderWorkflow";

type WorkflowsProviderProps = PropsWithChildren<{
  accessToken: string;
  email?: string;
}>;

/** Connects the Temporal workflows of the signed in user to the app. */
export function WorkflowsProvider({
  accessToken,
  email,
  children,
}: WorkflowsProviderProps) {
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const client = useMemo(
    () =>
      new WorkflowClient<WorkflowsContext>({
        // Add the other workflows of the app here
        workflows: [orderWorkflow],
        context: { getAccessToken: () => accessTokenRef.current },
        storage: canUseDOM && email ? window.localStorage : undefined,
        storageKey: `workflows:${email}`,
      }),
    [email],
  );

  // Remove what the previous versions of this store left behind
  useEffect(() => {
    window.localStorage.removeItem("workflows-store");
    window.localStorage.removeItem(`order-workflows:${email}`);
  }, [email]);

  return (
    <WorkflowClientProvider client={client}>{children}</WorkflowClientProvider>
  );
}

/** The workflow of an order, and whether stored orders were restored already. */
export function useOrderWorkflow(referenceId: string) {
  const workflow = useWorkflow({ workflow: orderWorkflow, id: referenceId });
  const client = useWorkflowClient();
  // Renders again when the client restores the stored orders
  useWorkflows({ workflow: orderWorkflow });
  return {
    ...workflow,
    isHydrated: client?.isHydrated ?? false,
    /** Asks the backend for an order that isn't kept in this browser. */
    find: async () =>
      (await client?.find(orderWorkflow, referenceId)) ?? "missing",
  };
}
