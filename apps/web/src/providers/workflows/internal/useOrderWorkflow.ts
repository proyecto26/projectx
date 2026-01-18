import { type UseQueryOptions, useQueries } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useLocation } from "react-router";
import { toast } from "react-toastify";

import { EXPIRED_STATUS_CODE, NOT_FOUND_STATUS_CODE } from "../constants";
import { cancelOrder, createOrder, getOrderStatus } from "../services/order";
import {
  OrderFailureStatus,
  OrderStatus,
  OrderSuccessStatus,
  type OrderWorkflow,
  WorkflowStep,
  WorkflowTypes,
} from "../types";
import { useWorkflowActions } from "../useWorkflowActions";
import { useWorkflowExpiration } from "./useWorkflowExpiration";

export type WorkflowProps = {
  accessToken: string;
  workflows: Array<OrderWorkflow>;
};

const END_STATUS = [...OrderSuccessStatus, ...OrderFailureStatus];
const QUERY_KEY = "order-workflow";
const WORKFLOW_TYPE = WorkflowTypes.ORDER;

export const useOrderWorkflow = ({ accessToken, workflows }: WorkflowProps) => {
  const location = useLocation();
  const {
    handleError,
    handleClear,
    handleUpsert,
    handleUpdate,
    handleInitilize,
  } = useWorkflowActions<OrderWorkflow>({
    workflowType: WORKFLOW_TYPE,
  });
  const { handleExpiration } = useWorkflowExpiration({
    workflowType: WORKFLOW_TYPE,
  });

  // Run the pending workflows
  return useQueries({
    queries: workflows
      .filter((w) => !w.error)
      .map((workflow) => {
        return <UseQueryOptions>{
          cacheTime: 0,
          refetchIntervalInBackground: true,
          refetchOnWindowFocus: true,
          enabled: !!accessToken,
          queryKey: [
            QUERY_KEY,
            workflow.step,
            workflow.data?.referenceId,
            workflow.isInitialized,
          ],
          retry: true,
          useErrorBoundary: () => false,
          queryFn: async () => {
            switch (workflow.step) {
              case WorkflowStep.STATUS:
                try {
                  const orderState = await getOrderStatus(
                    accessToken as string,
                    workflow.referenceId,
                  );
                  if (END_STATUS.includes(orderState.status)) {
                    // Handle completed status
                    handleUpsert({
                      referenceId: workflow.referenceId,
                      workflow: {
                        data: Object.assign({}, workflow.data, orderState),
                      },
                    });
                    const isOrderPage = location.pathname.includes("/checkout");
                    if (OrderSuccessStatus.includes(orderState?.status)) {
                      toast.success("Order completed successfully");
                    } else if (
                      !isOrderPage &&
                      OrderFailureStatus.includes(orderState?.status)
                    ) {
                      toast.error(
                        orderState.status === OrderStatus.Cancelled
                          ? "The transaction was cancelled."
                          : "The transaction has failed, please try again.",
                      );
                    }
                    return orderState;
                  }
                  if (!workflow.isInitialized) {
                    handleInitilize(workflow.referenceId);
                    return null;
                  }
                  return Promise.reject("Order status is loading");
                } catch (error) {
                  if (
                    error instanceof AxiosError &&
                    error.status &&
                    [EXPIRED_STATUS_CODE, NOT_FOUND_STATUS_CODE].includes(
                      error.status,
                    )
                  ) {
                    handleClear({ workflow });
                  }
                  throw error;
                } finally {
                  handleExpiration(workflow);
                }
              case WorkflowStep.CANCEL:
                try {
                  await cancelOrder(accessToken, workflow.referenceId);
                  handleUpsert({
                    referenceId: workflow.referenceId,
                    workflow: {
                      step: WorkflowStep.STATUS,
                      retries: 0,
                    },
                  });
                  return true;
                } catch {
                  return false;
                }
              case WorkflowStep.START:
              default:
                try {
                  const response = await createOrder(
                    accessToken,
                    workflow.data,
                  );
                  if (response) {
                    handleUpdate({
                      workflow: {
                        ...workflow,
                        step: WorkflowStep.STATUS,
                        // Possible new referenceId decided by the server
                        referenceId: response.referenceId,
                        retries: 0,
                        data: Object.assign({}, workflow.data, {
                          response: {
                            referenceId: response.referenceId,
                            clientSecret: response.clientSecret,
                            orderId: response.orderId,
                            status: OrderStatus.Pending,
                          },
                        }),
                      },
                      // Current referenceId
                      referenceId: workflow.referenceId,
                    });
                  }
                  return response;
                } catch (error) {
                  handleError({ workflow, error: error as Error });
                  return null;
                }
            }
          },
        };
      }),
  });
};
