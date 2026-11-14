import {
  cancelWorkflowSignal,
  MAX_PAYMENT_ATTEMPTS,
  type OrderProcessPaymentState,
  OrderProcessPaymentStatus,
  type OrderWorkflowData,
  type PaymentWebhookEvent,
  PROCESS_PAYMENT_TIMEOUT,
  paymentProgressSignal,
  paymentWebHookEventSignal,
} from "@projectx/core/workflows";
import type { OrderPaymentFailure } from "@projectx/models";
import { PaymentFailureReason } from "@projectx/models/enums";
import {
  allHandlersFinished,
  condition,
  getExternalWorkflowHandle,
  log,
  proxyActivities,
  setHandler,
  workflowInfo,
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

/** Why the order stops waiting for a payment, before checking with the provider */
type CloseReason = "cancelled" | "declined" | "timeout";

const closedStatus: Record<CloseReason, OrderProcessPaymentStatus> = {
  cancelled: OrderProcessPaymentStatus.CANCELLED,
  declined: OrderProcessPaymentStatus.DECLINED,
  timeout: OrderProcessPaymentStatus.FAILURE,
};

export async function processPayment(
  data: OrderWorkflowData,
): Promise<OrderProcessPaymentState> {
  const state: OrderProcessPaymentState = {
    status: OrderProcessPaymentStatus.PENDING,
  };
  log.info("Processing payment", { data });

  // A failed attempt doesn't end the order: Stripe lets the customer pay the same
  // intent again. It ends when this is set, after cancelling the intent with Stripe
  let closeReason: CloseReason | undefined;
  const close = (reason: CloseReason) => {
    // A cancellation requested by the customer is what they should see
    if (!closeReason || reason === "cancelled") closeReason = reason;
    // Checkout stops offering a retry while the intent is being cancelled
    if (state.failure?.retryable) {
      state.failure = { ...state.failure, retryable: false };
      reportProgress(state.failure);
    }
  };
  let isCanceledByProvider = false;
  // Each attempt once, as Stripe may send an event twice or in two Event objects
  const seenEvents = new Set<string>();
  const failedAttempts = new Set<string>();
  // Increases with any news that can change what to do while closing
  let news = 0;
  const isPaid = () => state.status === OrderProcessPaymentStatus.SUCCESS;
  const isOver = () => isPaid() || isCanceledByProvider;

  // The parent shows the progress to the customer, so it can't miss any
  const parent = workflowInfo().parent;
  const reports: Promise<unknown>[] = [];
  const reportProgress = (failure: OrderPaymentFailure) => {
    if (!parent) return;
    reports.push(
      getExternalWorkflowHandle(parent.workflowId, parent.runId)
        .signal(paymentProgressSignal, failure)
        .catch((error: unknown) =>
          log.warn("Couldn't report the payment progress", { error }),
        ),
    );
  };

  // Attach queries, signals and updates
  setHandler(cancelWorkflowSignal, () => {
    // A failed attempt can still be paid later, so only a success is too late
    if (isPaid()) {
      log.warn("Payment already completed, cannot cancel");
      return;
    }
    log.warn("Cancelling payment");
    close("cancelled");
    news++;
  });
  setHandler(paymentWebHookEventSignal, (event: PaymentWebhookEvent) => {
    log.info("Received payment webhook event", { type: event.type });
    if (seenEvents.has(event.id)) return;
    seenEvents.add(event.id);
    // Nothing can undo a payment, as events can arrive late or out of order
    if (isPaid()) return;
    news++;

    if (initiatedWebhookEvents.includes(event.type)) {
      if (state.status === OrderProcessPaymentStatus.PENDING) {
        state.status = OrderProcessPaymentStatus.INITIATED;
      }
    } else if (confirmedWebhookEvents.includes(event.type)) {
      state.status = OrderProcessPaymentStatus.SUCCESS;
      state.failure = undefined;
    } else if (event.type === "payment_intent.canceled") {
      isCanceledByProvider = true;
    } else if (event.type === "payment_intent.payment_failed") {
      failedAttempts.add(event.failure?.attempt ?? event.id);
      // Without a classification, it's a decline the attempt cap limits
      const reason = event.failure?.reason ?? PaymentFailureReason.Declined;
      const isLast =
        event.failure?.retryable === false ||
        failedAttempts.size >= MAX_PAYMENT_ATTEMPTS;
      if (isLast) close("declined");
      state.failure = {
        reason,
        attempts: failedAttempts.size,
        retryable: !closeReason,
      };
      reportProgress(state.failure);
    }

    log.info("Updated payment status", { status: state.status });
  });

  // One deadline for every attempt, retries don't extend it
  const isAnswered = await condition(
    () => isOver() || !!closeReason,
    PROCESS_PAYMENT_TIMEOUT,
  );
  if (!isAnswered) close("timeout");

  // Closing has to stop the payment provider too, where it may be too late.
  // A webhook confirming the payment doesn't need the provider to answer. Only one
  // wait, as each one stays registered until the workflow closes
  const paidByWebhook = condition(isPaid).then(() => "paid" as const);
  while (closeReason && !isOver()) {
    // Before asking, so news arriving while it answers isn't missed
    const seen = news;
    const outcome = await Promise.race([
      cancelPayment(data.order.referenceId),
      paidByWebhook,
    ]);
    // Both can happen at once, and a confirmed payment wins over any other answer
    if (isPaid()) break;
    if (outcome === "paid") {
      state.status = OrderProcessPaymentStatus.SUCCESS;
      break;
    }
    if (outcome === "cancelled") break;
    // Being processed, so wait for news, such as a failure that makes it
    // cancellable, and ask again. No news doesn't tell it can't succeed
    await condition(() => isOver() || news !== seen, PROCESS_PAYMENT_TIMEOUT);
  }

  if (!isPaid()) {
    state.status = closeReason
      ? closedStatus[closeReason]
      : OrderProcessPaymentStatus.CANCELLED;
  }

  // Wait for all handlers and reports to finish before workflow completion
  await Promise.all(reports);
  await condition(allHandlersFinished);

  return state;
}
