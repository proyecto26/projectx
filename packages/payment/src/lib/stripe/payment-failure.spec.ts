import { PaymentFailureReason } from "@projectx/models";
import { describe, expect, it } from "vitest";

import { classifyPaymentFailure } from "./payment-failure";

describe("classifyPaymentFailure", () => {
  it.each([
    ["fraudulent"],
    ["stolen_card"],
    ["lost_card"],
    ["merchant_blacklist"],
    ["pickup_card"],
    ["restricted_card"],
    ["security_violation"],
    ["revocation_of_authorization"],
    ["revocation_of_all_authorizations"],
    ["transaction_not_allowed"],
  ])("ends the order on %s, telling only that it was declined", (declineCode) => {
    expect(
      classifyPaymentFailure({ code: "card_declined", declineCode }),
    ).toEqual({ reason: PaymentFailureReason.Declined, retryable: false });
  });

  it("ends the order when Radar blocked the charge", () => {
    expect(
      classifyPaymentFailure({
        code: "card_declined",
        declineCode: "generic_decline",
        outcomeType: "blocked",
      }).retryable,
    ).toBe(false);
  });

  it.each([
    { outcomeReason: "highest_risk_level" },
    { riskLevel: "highest" },
  ])("ends the order on the highest risk %o", (outcome) => {
    expect(
      classifyPaymentFailure({ code: "card_declined", ...outcome }).retryable,
    ).toBe(false);
  });

  it.each([
    [
      { declineCode: "insufficient_funds" },
      PaymentFailureReason.InsufficientFunds,
    ],
    [{ code: "incorrect_cvc" }, PaymentFailureReason.IncorrectDetails],
    [{ code: "incorrect_number" }, PaymentFailureReason.IncorrectDetails],
    [
      { declineCode: "invalid_expiry_year" },
      PaymentFailureReason.IncorrectDetails,
    ],
    [{ code: "expired_card" }, PaymentFailureReason.ExpiredCard],
    [
      { code: "payment_intent_authentication_failure" },
      PaymentFailureReason.AuthenticationFailed,
    ],
    [{ code: "processing_error" }, PaymentFailureReason.TryAgain],
    [{ declineCode: "try_again_later" }, PaymentFailureReason.TryAgain],
    [{ declineCode: "generic_decline" }, PaymentFailureReason.Declined],
    [{ declineCode: "do_not_honor" }, PaymentFailureReason.Declined],
    [{ declineCode: "something_new" }, PaymentFailureReason.Declined],
    [{}, PaymentFailureReason.Declined],
  ])("lets the customer retry after %o", (details, reason) => {
    expect(
      classifyPaymentFailure({ code: "card_declined", ...details }),
    ).toEqual({ reason, retryable: true });
  });

  it("only ever returns reasons safe to show", () => {
    const safe = new Set<string>(Object.values(PaymentFailureReason));
    for (const declineCode of [
      "fraudulent",
      "stolen_card",
      "x",
      "insufficient_funds",
    ]) {
      expect(safe.has(classifyPaymentFailure({ declineCode }).reason)).toBe(
        true,
      );
    }
  });
});
