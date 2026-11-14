export enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
  Provision = "provision",
}

export enum OrderStatus {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Shipped = "Shipped",
  Delivered = "Delivered",
  Cancelled = "Cancelled",
  Failed = "Failed",
}

export enum PaymentStatus {
  Pending = "Pending",
  Completed = "Completed",
  Failed = "Failed",
  Refunded = "Refunded",
}

/**
 * Why a payment attempt failed, safe to show to the customer. Declines that hint
 * at fraud, such as a stolen card, are only ever reported as `Declined`.
 */
export enum PaymentFailureReason {
  Declined = "declined",
  InsufficientFunds = "insufficient_funds",
  IncorrectDetails = "incorrect_details",
  ExpiredCard = "expired_card",
  AuthenticationFailed = "authentication_failed",
  TryAgain = "try_again",
}

/** The last failed payment attempt of an order, as the payment workflow sees it */
export type OrderPaymentFailure = {
  reason: PaymentFailureReason;
  /** Failed attempts so far, each counted once */
  attempts: number;
  /** Whether the customer can still pay this order */
  retryable: boolean;
};
