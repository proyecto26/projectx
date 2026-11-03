import {
  cancelWorkflowSignal,
  type OrderProcessPaymentState,
  OrderProcessPaymentStatus,
  type OrderWorkflowData,
  type PaymentWebhookEvent,
  PROCESS_PAYMENT_TIMEOUT,
  paymentWebHookEventSignal,
} from "@projectx/core/workflows";
import {
  allHandlersFinished,
  condition,
  log,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";

import type { ActivitiesService } from "../main";

// It retries until the payment provider answers, as giving up would stop tracking
// a payment that can still happen. Its answer also tells about a payment made
// while it was retrying.
const { cancelPayment } = proxyActivities<ActivitiesService>({
  startToCloseTimeout: "30 seconds",
  retry: {
    initialInterval: "2s",
    maximumInterval: "1 minute",
    backoffCoefficient: 1.5,
  },
});

export const finalPaymentStatuses = [
  OrderProcessPaymentStatus.SUCCESS,
  OrderProcessPaymentStatus.FAILURE,
  OrderProcessPaymentStatus.DECLINED,
  OrderProcessPaymentStatus.CANCELLED,
];

const initiatedWebhookEvents = [
  "payment_intent.created",
  "payment_intent.processing",
  "payment_method.attached",
];

const confirmedWebhookEvents = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "payment_intent.succeeded",
];

const failedWebhookEvents = [
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

export async function processPayment(
  data: OrderWorkflowData,
): Promise<OrderProcessPaymentState> {
  const state: OrderProcessPaymentState = {
    status: OrderProcessPaymentStatus.PENDING,
  };
  log.info("Processing payment", { data });

  // Apart from the status, as a webhook about the payment can't undo the request
  let isCancelRequested = false;
  const isSettled = () => finalPaymentStatuses.includes(state.status);
  // A function, as a signal can change the status during any await
  const isPaid = () => state.status === OrderProcessPaymentStatus.SUCCESS;

  // Attach queries, signals and updates
  setHandler(cancelWorkflowSignal, () => {
    if (finalPaymentStatuses.includes(state.status)) {
      log.warn("Payment already completed, cannot cancel");
      return;
    }
    log.warn("Cancelling payment");
    isCancelRequested = true;
  });
  setHandler(paymentWebHookEventSignal, (event: PaymentWebhookEvent) => {
    log.info("Received payment webhook event", { type: event.type });

    if (initiatedWebhookEvents.includes(event.type)) {
      state.status = OrderProcessPaymentStatus.INITIATED;
    } else if (confirmedWebhookEvents.includes(event.type)) {
      state.status = OrderProcessPaymentStatus.SUCCESS;
    } else if (failedWebhookEvents.includes(event.type)) {
      state.status = OrderProcessPaymentStatus.FAILURE;
    }

    log.info("Updated payment status", { status: state.status });
  });

  // Wait for payment to complete or timeout
  await condition(
    () => isSettled() || isCancelRequested,
    PROCESS_PAYMENT_TIMEOUT,
  );

  // Cancelling has to stop the payment provider too, where it may be too late
  while (isCancelRequested && !isPaid()) {
    // A webhook confirming the payment doesn't need the provider to answer
    const outcome = await Promise.race([
      cancelPayment(data.order.referenceId),
      condition(isPaid).then(() => "paid" as const),
    ]);
    // Both can happen at once, and a confirmed payment wins over any other answer
    if (isPaid()) break;
    if (outcome === "cancelled") {
      state.status = OrderProcessPaymentStatus.CANCELLED;
    } else if (outcome === "paid") {
      state.status = OrderProcessPaymentStatus.SUCCESS;
    } else {
      // Being processed, so wait for its webhook and ask again. Any answer other
      // than a success, or no answer, doesn't tell the payment can't succeed
      state.status = OrderProcessPaymentStatus.INITIATED;
      await condition(isSettled, PROCESS_PAYMENT_TIMEOUT);
      continue;
    }
    break;
  }

  // Wait for all handlers to finish before workflow completion
  await condition(allHandlersFinished);

  return state;
}
