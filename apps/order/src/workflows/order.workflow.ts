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
  PRODUCT_UNAVAILABLE,
  paymentProgressSignal,
  paymentWebHookEventSignal,
  UnkownException,
} from "@projectx/core/workflows";
import type { OrderStatusResponseDto } from "@projectx/models";
import { OrderStatus } from "@projectx/models/enums";
import {
  ActivityFailure,
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

type PaymentWorkflowHandle = ChildWorkflowHandle<typeof processPayment>;

/** The failure of an order whose products can't be sold, if that's what happened */
function productRejection(error: unknown): ApplicationFailure | undefined {
  const failure = error instanceof ActivityFailure ? error.cause : error;
  if (
    failure instanceof ApplicationFailure &&
    failure.type === PRODUCT_UNAVAILABLE
  ) {
    return failure;
  }
  return undefined;
}

export async function createOrder(
  data: OrderWorkflowData,
  state = initialState,
): Promise<void> {
  const stream = new WorkflowStream();
  const publishState = () =>
    stream.topic<Partial<OrderStatusResponseDto>>("state").publish(state);

  state.referenceId = data.order.referenceId;
  let isCreatingOrder = false;
  // Its products can't be sold, so the order will never exist
  let rejection: ApplicationFailure | undefined;
  // Define references to child workflows
  let processPaymentWorkflow: PaymentWorkflowHandle | undefined;

  let isCancelRequested = false;
  // Events for the payment process, kept in order until it exists
  const pendingEvents: unknown[] = [];
  let isPaymentOver = false;
  // One at a time, so the payment process gets them in order
  let forwarding: Promise<void> = Promise.resolve();
  const forward = (send: (child: PaymentWorkflowHandle) => Promise<void>) => {
    const child = processPaymentWorkflow;
    if (!child) return;
    forwarding = forwarding
      .then(() => send(child))
      .catch((error: unknown) =>
        // It already closed, after settling the payment with the provider
        log.warn("Couldn't reach the payment process", { error }),
      );
  };

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
      forward((child) => child.signal(cancelWorkflowSignal));
    } else {
      log.info("The payment process isn't running");
    }
  });
  setHandler(paymentWebHookEventSignal, (event) => {
    if (processPaymentWorkflow) {
      forward((child) => child.signal(paymentWebHookEventSignal, event));
    } else if (!isPaymentOver) {
      pendingEvents.push(event);
    } else {
      log.warn("The payment process already finished");
    }
  });
  // The payment process decides, this only shows it to the customer
  setHandler(paymentProgressSignal, (failure) => {
    state.paymentFailure = failure;
    publishState();
  });
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
    } catch (error) {
      rejection = productRejection(error);
      if (rejection) {
        state.status = OrderStatus.Failed;
        publishState();
        // The caller gets the reason and the product ids, not the activity wrapper
        throw rejection;
      }
      throw error;
    } finally {
      isCreatingOrder = false;
    }
  });

  // Wait the order to be ready to be processed
  const orderCreated = await condition(
    () => !!state?.orderId || !!rejection,
    ORDER_TIMEOUT,
  );

  // Wait for the update to finish. A subscriber waiting for new items also counts
  // as a running handler, so the stream can't wait for all of them at this point.
  await condition(() => !isCreatingOrder);

  if (rejection) {
    // Nothing was created: close now instead of waiting for the timeout
    stream.detachPollers();
    await condition(allHandlersFinished);
    throw ApplicationFailure.nonRetryable(
      rejection.message,
      PRODUCT_UNAVAILABLE,
    );
  }

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
      for (const event of pendingEvents.splice(0)) {
        forward((child) =>
          child.signal(paymentWebHookEventSignal, event as never),
        );
      }
      if (isCancelRequested) {
        forward((child) => child.signal(cancelWorkflowSignal));
      }
      const processPaymentResult = await processPaymentWorkflow.result();
      // Late events have nowhere to go, as it settled the payment before closing
      processPaymentWorkflow = undefined;
      isPaymentOver = true;
      if (processPaymentResult.status !== OrderProcessPaymentStatus.SUCCESS) {
        // The customer sees why it ended, a cancellation isn't a failed payment
        const endStatus =
          processPaymentResult.status === OrderProcessPaymentStatus.CANCELLED
            ? OrderStatus.Cancelled
            : OrderStatus.Failed;
        // Report payment failure before throwing the error
        await reportPaymentFailed(state.orderId as number, endStatus);
        state.status = endStatus;
        publishState();
        throw ApplicationFailure.nonRetryable(
          UnkownException.name,
          "Payment failed",
        );
      }
      state.paymentFailure = undefined;
      state.status = OrderStatus.Confirmed;
      await reportPaymentConfirmed(state.orderId as number);
      publishState();
    }

    // TODO: Second step - Ship the order
  } finally {
    // Answer the waiting subscribers before the workflow closes
    stream.detachPollers();
    await forwarding;
    await condition(allHandlersFinished);
  }
}
