import { useOrderWorkflow } from "./internal/useOrderWorkflow";
import { useStoreState } from "./store";
import { type OrderWorkflow, WorkflowTypes } from "./types";
import { useWorkflowsByType } from "./utils";

export type WorkflowProps = {
  accessToken: string;
  email?: string;
};

/**
 * Connect the backend workflows to the frontend
 */
export const useWorkflows = ({ accessToken, email }: WorkflowProps) => {
  // The store has all the existing workflows and the actions to update them
  const store = useStoreState();

  // Connect the workflow to manage the order transactions
  useOrderWorkflow({
    accessToken,
    workflows: useWorkflowsByType<OrderWorkflow>(
      store,
      WorkflowTypes.ORDER,
      email,
    ),
  });

  // Connect other workflows here...
};
