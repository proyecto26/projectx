// Typescript alias issue while importing files from other libraries from workflows.
import {
  cancelWorkflowSignal,
  createOrderUpdate,
  getOrderStateQuery,
  getWorkflowIdByPaymentOrder,
  ORDER_TIMEOUT,
  OrderProcessPaymentStatus,
  type OrderWorkflowData,
  OrderWorkflowNonRetryableErrors,
  paymentWebHookEventSignal,
} from "@projectx/core/workflows";
import { OrderStatus, type OrderStatusResponseDto } from "@projectx/models";
import {
  ApplicationFailure,
  allHandlersFinished,
  type ChildWorkflowHandle,
  condition,
  log,
  proxyActivities,
  setHandler,
  startChild,
} from "@temporalio/workflow";
import type { ActivitiesService } from "../main";
import { processPayment } from "./process-payment.workflow";

const {
  createOrder: createOrderActivity,
  reportPaymentFailed,
  reportPaymentConfirmed,
} = proxyActivities<ActivitiesService>({
  startToCloseTimeout: "5 seconds",
  retry: {
    initialInterval: "2s",
    maximumInterval: "10s",
    maximumAttempts: 10,
    backoffCoefficient: 1.5,
    nonRetryableErrorTypes: [OrderWorkflowNonRetryableErrors.UNKNOWN_ERROR],
  },
});

const initialState: Partial<OrderStatusResponseDto> = {
  status: OrderStatus.Pending,
  referenceId: "",
};

export async function createOrder(
  data: OrderWorkflowData,
  state = initialState,
): Promise<void> {
  state.referenceId = data.order.referenceId;
  // Define references to child workflows
  let processPaymentWorkflow:
    | ChildWorkflowHandle<typeof processPayment>
    | undefined;

  // Attach queries, signals and updates
  setHandler(getOrderStateQuery, () => state as OrderStatusResponseDto);
  setHandler(cancelWorkflowSignal, () => {
    log.info("Requesting order cancellation");
    if (!state?.orderId) {
      throw ApplicationFailure.nonRetryable(
        OrderWorkflowNonRetryableErrors.CANCELLED,
        "Order cancelled",
      );
    }
    if (processPaymentWorkflow) {
      void processPaymentWorkflow.signal(cancelWorkflowSignal);
    } else {
      log.error("The payment process has already finished, cannot cancel");
    }
  });
  setHandler(
    paymentWebHookEventSignal,
    (e: unknown) =>
      void processPaymentWorkflow?.signal(paymentWebHookEventSignal, e),
  );
  // Create the order and the payment intent with the payment provider
  setHandler(createOrderUpdate, async () => {
    const { order, clientSecret } = await createOrderActivity(data);
    state.orderId = order.id;
    state.referenceId = order.referenceId;
    if (clientSecret) {
      state.clientSecret = clientSecret;
    }
    return state as OrderStatusResponseDto;
  });

  // Wait the order to be ready to be processed
  const orderCreated = await condition(() => !!state?.orderId, ORDER_TIMEOUT);

  // Wait for all handlers to finish before workflow completion
  await condition(allHandlersFinished);

  if (!orderCreated || !state?.orderId) {
    throw ApplicationFailure.nonRetryable(
      OrderWorkflowNonRetryableErrors.UNKNOWN_ERROR,
      "Order creation timed out",
    );
  }

  // First step - Process payment
  if (state.status === OrderStatus.Pending) {
    processPaymentWorkflow = await startChild(processPayment, {
      args: [data],
      workflowId: getWorkflowIdByPaymentOrder(state.referenceId),
    });
    const processPaymentResult = await processPaymentWorkflow.result();
    if (processPaymentResult.status !== OrderProcessPaymentStatus.SUCCESS) {
      // Report payment failure before throwing the error
      await reportPaymentFailed(state.orderId as number);
      state.status = OrderStatus.Failed;
      throw ApplicationFailure.nonRetryable(
        OrderWorkflowNonRetryableErrors.UNKNOWN_ERROR,
        "Payment failed",
      );
    }
    processPaymentWorkflow = undefined;
    state.status = OrderStatus.Confirmed;
    await reportPaymentConfirmed(state.orderId as number);
  }

  // TODO: Second step - Ship the order
}
