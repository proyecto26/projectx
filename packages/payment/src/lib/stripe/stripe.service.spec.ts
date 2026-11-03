import { describe, expect, it, vi } from "vitest";

import { StripeService } from "./stripe.service";

function serviceWith(retrieve: () => Promise<unknown>) {
  const service = Object.create(StripeService.prototype) as StripeService;
  Object.assign(service, {
    stripe: { charges: { retrieve: vi.fn(retrieve) } },
  });
  return service;
}

const failedIntent = (charge?: string, decline_code = "generic_decline") =>
  ({
    last_payment_error: { code: "card_declined", decline_code, charge },
  }) as never;

describe("StripeService.describePaymentFailure", () => {
  it("ends the order when Radar blocked a generic decline", async () => {
    const service = serviceWith(async () => ({
      outcome: { type: "blocked", reason: "highest_risk_level" },
    }));
    await expect(
      service.describePaymentFailure(failedIntent("ch_1")),
    ).resolves.toEqual({
      attempt: "ch_1",
      reason: "declined",
      retryable: false,
    });
  });

  it("lets the customer retry an issuer decline", async () => {
    const service = serviceWith(async () => ({
      outcome: { type: "issuer_declined", reason: "insufficient_funds" },
    }));
    await expect(
      service.describePaymentFailure(
        failedIntent("ch_1", "insufficient_funds"),
      ),
    ).resolves.toEqual({
      attempt: "ch_1",
      reason: "insufficient_funds",
      retryable: true,
    });
  });

  it("fails instead of guessing when the charge can't be read", async () => {
    const service = serviceWith(async () => {
      throw new Error("Stripe down");
    });
    await expect(
      service.describePaymentFailure(failedIntent("ch_1")),
    ).rejects.toThrow("Stripe down");
  });

  it("classifies a failure without a charge from its code", async () => {
    const retrieve = vi.fn();
    const service = serviceWith(retrieve);
    await expect(
      service.describePaymentFailure({
        last_payment_error: { code: "payment_intent_authentication_failure" },
      } as never),
    ).resolves.toEqual({
      attempt: undefined,
      reason: "authentication_failed",
      retryable: true,
    });
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("has nothing to say without a failure", async () => {
    const service = serviceWith(async () => ({}));
    await expect(
      service.describePaymentFailure({ last_payment_error: null } as never),
    ).resolves.toBeUndefined();
  });
});
