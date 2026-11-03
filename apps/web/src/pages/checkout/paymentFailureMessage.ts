import type { OrderPaymentFailure } from "@projectx/models";
import { PaymentFailureReason } from "@projectx/models/enums";

// Never more specific than this: a card flagged as stolen reads as a decline
const messages: Record<PaymentFailureReason, string> = {
  [PaymentFailureReason.Declined]: "Your card was declined.",
  [PaymentFailureReason.InsufficientFunds]:
    "Your card doesn't have enough funds. Try another card.",
  [PaymentFailureReason.IncorrectDetails]:
    "Some card details are incorrect. Check them and try again.",
  [PaymentFailureReason.ExpiredCard]:
    "Your card has expired. Try another card.",
  [PaymentFailureReason.AuthenticationFailed]:
    "We couldn't verify the payment with your bank. Try again.",
  [PaymentFailureReason.TryAgain]:
    "The payment couldn't be processed. Try again in a moment.",
};

/** What to tell the customer about their last failed payment attempt */
export function paymentFailureMessage({ reason }: OrderPaymentFailure) {
  return messages[reason] ?? messages[PaymentFailureReason.Declined];
}
