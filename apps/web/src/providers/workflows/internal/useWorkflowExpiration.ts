import { useCallback, useRef } from "react";
import type { Workflow, WorkflowType } from "../types";
import { useWorkflowActions } from "../useWorkflowActions";
export type WorkflowExpirationProps = {
  workflowType: WorkflowType;
};

/**
 * Manage the expiration of the workflows.
 * If the expiration time is reached, the workflow is cleared
 * If the maximum retries are reached, the workflow is marked as failed
 */
export const useWorkflowExpiration = ({
  workflowType,
}: WorkflowExpirationProps) => {
  const mapRetriesByWorkflowRef = useRef<Record<string, number>>({});
  const { handleError, handleClear, workflows, handleUpsert } =
    useWorkflowActions<Workflow<unknown>>({ workflowType });

  const handleExpiration = useCallback(
    (workflow: Workflow<unknown>) => {
      if (
        workflow.expirationTimeInMilliseconds &&
        Date.now() > workflow.expirationTimeInMilliseconds
      ) {
        console.warn(`${workflowType}: Expiration time reached.`);
        return handleClear({ workflow });
      }
      if (!workflow.maxRetries) return;
      let retries =
        mapRetriesByWorkflowRef.current[workflow.referenceId] ||
        workflow.retries ||
        0;
      retries++;
      if (retries > workflow.maxRetries) {
        return handleError({
          workflow,
          error: new Error(
            "Maximum transaction attempts reached. Please check your internet connection and try again.",
          ),
        });
      }
      const workflowToUpdate = workflows.find(
        ({ referenceId }) => referenceId === workflow.referenceId,
      );
      if (workflowToUpdate) {
        handleUpsert({
          workflow: {
            retries,
          },
          referenceId: workflow.referenceId,
        });
        mapRetriesByWorkflowRef.current[workflow.referenceId] = retries;
      }
    },
    [handleClear, handleError, handleUpsert, workflowType, workflows],
  );

  const handleClearRetries = (referenceId: string) => {
    delete mapRetriesByWorkflowRef.current[referenceId];
  };

  return {
    handleExpiration,
    handleClearRetries,
  };
};
