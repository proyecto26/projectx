import { PaymentFailureReason } from "@projectx/models";

/** What the payment provider said about a failed attempt */
export type PaymentFailureDetails = {
  /** `last_payment_error.code` */
  code?: string | null;
  /** `last_payment_error.decline_code` */
  declineCode?: string | null;
  /** `charge.outcome.type`, `blocked` when Radar blocked it */
  outcomeType?: string | null;
  /** `charge.outcome.reason`, such as `highest_risk_level` */
  outcomeReason?: string | null;
  /** `charge.outcome.risk_level` */
  riskLevel?: string | null;
};

export type PaymentFailureClassification = {
  reason: PaymentFailureReason;
  /** Whether the customer may try again on the same order */
  retryable: boolean;
};

// Stripe asks not to tell the customer why, and retrying won't help
// https://docs.stripe.com/declines/codes
const terminalCodes = new Set([
  "fraudulent",
  "stolen_card",
  "lost_card",
  "merchant_blacklist",
  "pickup_card",
  "restricted_card",
  "security_violation",
  "revocation_of_authorization",
  "revocation_of_all_authorizations",
  "transaction_not_allowed",
  "highest_risk_level",
]);

const retryableReasons: Record<string, PaymentFailureReason> = {
  insufficient_funds: PaymentFailureReason.InsufficientFunds,
  incorrect_number: PaymentFailureReason.IncorrectDetails,
  invalid_number: PaymentFailureReason.IncorrectDetails,
  incorrect_cvc: PaymentFailureReason.IncorrectDetails,
  invalid_cvc: PaymentFailureReason.IncorrectDetails,
  incorrect_zip: PaymentFailureReason.IncorrectDetails,
  invalid_expiry_month: PaymentFailureReason.IncorrectDetails,
  invalid_expiry_year: PaymentFailureReason.IncorrectDetails,
  incorrect_pin: PaymentFailureReason.IncorrectDetails,
  invalid_pin: PaymentFailureReason.IncorrectDetails,
  expired_card: PaymentFailureReason.ExpiredCard,
  authentication_required: PaymentFailureReason.AuthenticationFailed,
  payment_intent_authentication_failure:
    PaymentFailureReason.AuthenticationFailed,
  processing_error: PaymentFailureReason.TryAgain,
  issuer_not_available: PaymentFailureReason.TryAgain,
  reenter_transaction: PaymentFailureReason.TryAgain,
  try_again_later: PaymentFailureReason.TryAgain,
};

/**
 * Decides if the customer can try again after a failed attempt, and what they can
 * be told. Unknown answers can be retried as a generic decline, which the payment
 * workflow limits with its attempt cap.
 */
export function classifyPaymentFailure({
  code,
  declineCode,
  outcomeType,
  outcomeReason,
  riskLevel,
}: PaymentFailureDetails): PaymentFailureClassification {
  const isTerminal =
    outcomeType === "blocked" ||
    riskLevel === "highest" ||
    [code, declineCode, outcomeReason].some(
      (value) => !!value && terminalCodes.has(value),
    );
  if (isTerminal) {
    return { reason: PaymentFailureReason.Declined, retryable: false };
  }
  const known = [declineCode, code].find(
    (value): value is string => !!value && value in retryableReasons,
  );
  return {
    reason: known ? retryableReasons[known] : PaymentFailureReason.Declined,
    retryable: true,
  };
}
