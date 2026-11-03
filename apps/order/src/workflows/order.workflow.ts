// Typescript alias issue while importing files from other libraries from workflows.
import {
  CancelledException,
  cancelWorkflowSignal,
  createOrderUpdate,
  getOrderStateQuery,
  getWorkflowIdByPaymentOrder,
  ORDER_TIMEOUT,
  OrderProcessPaymentStatus,
  type OrderWorkflowData,
  paymentWebHookEventSignal,
  UnkownException,
} from "@projectx/core/workflows";
import type { OrderStatusResponseDto } from "@projectx/models";
import { OrderStatus } from "@projectx/models/enums";
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
import { WorkflowStream } from "@temporalio/workflow-streams/workflow";
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
    nonRetryableErrorTypes: [UnkownException.name],
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
  const stream = new WorkflowStream();
  const publishState = () =>
    stream.topic<Partial<OrderStatusResponseDto>>("state").publish(state);

  state.referenceId = data.order.referenceId;
  let isCreatingOrder = false;
  // Define references to child workflows
  let processPaymentWorkflow:
    | ChildWorkflowHandle<typeof processPayment>
    | undefined;

  let isCancelRequested = false;

  // Attach queries, signals and updates
  setHandler(getOrderStateQuery, () => state as OrderStatusResponseDto);
  setHandler(cancelWorkflowSignal, () => {
    log.info("Requesting order cancellation");
    // While it's being created, its payment may exist already: remember the request
    if (!state?.orderId && !isCreatingOrder) {
      throw ApplicationFailure.nonRetryable(
        CancelledException.name,
        "Order cancelled",
      );
    }
    // Remembered, as the payment process may still be starting
    isCancelRequested = true;
    if (processPaymentWorkflow) {
      void processPaymentWorkflow.signal(cancelWorkflowSignal);
    } else {
      log.info("The payment process isn't running");
    }
  });
  setHandler(
    paymentWebHookEventSignal,
    (e: unknown) =>
      void processPaymentWorkflow?.signal(paymentWebHookEventSignal, e),
  );
  // Create the order and the payment intent with the payment provider
  setHandler(createOrderUpdate, async () => {
    isCreatingOrder = true;
    try {
      const { order, clientSecret } = await createOrderActivity(data);
      state.orderId = order.id;
      state.referenceId = order.referenceId;
      if (clientSecret) {
        state.clientSecret = clientSecret;
      }
      publishState();
      return state as OrderStatusResponseDto;
    } finally {
      isCreatingOrder = false;
    }
  });

  // Wait the order to be ready to be processed
  const orderCreated = await condition(() => !!state?.orderId, ORDER_TIMEOUT);

  // Wait for the update to finish. A subscriber waiting for new items also counts
  // as a running handler, so the stream can't wait for all of them at this point.
  await condition(() => !isCreatingOrder);

  if (!orderCreated || !state?.orderId) {
    throw ApplicationFailure.nonRetryable(
      UnkownException.name,
      "Order creation timed out",
    );
  }

  try {
    // First step - Process payment
    if (state.status === OrderStatus.Pending) {
      processPaymentWorkflow = await startChild(processPayment, {
        args: [data],
        workflowId: getWorkflowIdByPaymentOrder(state.referenceId),
      });
      if (isCancelRequested) {
        void processPaymentWorkflow.signal(cancelWorkflowSignal);
      }
      const processPaymentResult = await processPaymentWorkflow.result();
      if (processPaymentResult.status !== OrderProcessPaymentStatus.SUCCESS) {
        // Report payment failure before throwing the error
        await reportPaymentFailed(state.orderId as number);
        state.status = OrderStatus.Failed;
        publishState();
        throw ApplicationFailure.nonRetryable(
          UnkownException.name,
          "Payment failed",
        );
      }
      processPaymentWorkflow = undefined;
      state.status = OrderStatus.Confirmed;
      await reportPaymentConfirmed(state.orderId as number);
      publishState();
    }

    // TODO: Second step - Ship the order
  } finally {
    // Answer the waiting subscribers before the workflow closes
    stream.detachPollers();
    await condition(allHandlersFinished);
  }
}
