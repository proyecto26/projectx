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
  setHandler,
} from "@temporalio/workflow";

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

  // Attach queries, signals and updates
  setHandler(cancelWorkflowSignal, () => {
    if (finalPaymentStatuses.includes(state.status)) {
      log.warn("Payment already completed, cannot cancel");
      return;
    }
    log.warn("Cancelling payment");
    state.status = OrderProcessPaymentStatus.CANCELLED;
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
    () => finalPaymentStatuses.includes(state.status),
    PROCESS_PAYMENT_TIMEOUT,
  );

  // Wait for all handlers to finish before workflow completion
  await condition(allHandlersFinished);

  return state;
}
