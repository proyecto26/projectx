import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { StripeService } from "@projectx/payment";
import type { ClientService } from "@proyecto26/temporal-workflows";
import { WorkflowNotFoundError } from "@temporalio/client";

import { AppService } from "./app.service";

const intent = {
  id: "pi_1",
  amount: 100,
  currency: "usd",
  status: "requires_payment_method",
  metadata: { userId: "1", referenceId: "ref" },
};

function setup(type: string) {
  const signal = jest.fn().mockResolvedValue(undefined);
  const stripe = {
    constructWebhookEvent: jest.fn(() => ({ id: "evt_1", type })),
    handleWebhookEvent: jest.fn(() => intent),
    describePaymentFailure: jest.fn(),
  };
  const service = new AppService(
    { get: () => "orders" } as unknown as ConfigService,
    {
      client: { workflow: { getHandle: () => ({ signal }) } },
    } as unknown as ClientService,
    stripe as unknown as StripeService,
  );
  return { service, signal, stripe };
}

describe("AppService.handleWebhook", () => {
  it("sends a declined attempt to the workflow, classified", async () => {
    const { service, signal, stripe } = setup("payment_intent.payment_failed");
    stripe.describePaymentFailure.mockResolvedValue({
      attempt: "ch_1",
      reason: "insufficient_funds",
      retryable: true,
    });
    await expect(service.handleWebhook("{}", "sig")).resolves.toEqual({
      received: true,
    });
    expect(signal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: "evt_1",
        failure: {
          attempt: "ch_1",
          reason: "insufficient_funds",
          retryable: true,
        },
      }),
    );
  });

  it("uses the event as the attempt when there's no charge", async () => {
    const { service, signal, stripe } = setup("payment_intent.payment_failed");
    stripe.describePaymentFailure.mockResolvedValue({
      reason: "authentication_failed",
      retryable: true,
    });
    await service.handleWebhook("{}", "sig");
    expect(signal.mock.calls[0][1].failure.attempt).toBe("evt_1");
  });

  it("lets Stripe send it again when the failure can't be classified", async () => {
    const { service, signal, stripe } = setup("payment_intent.payment_failed");
    stripe.describePaymentFailure.mockRejectedValue(new Error("Stripe down"));
    await expect(service.handleWebhook("{}", "sig")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(signal).not.toHaveBeenCalled();
  });

  it("acknowledges an event for an order that already closed", async () => {
    const { service, signal } = setup("payment_intent.canceled");
    signal.mockRejectedValue(
      new WorkflowNotFoundError("closed", "order-ref", undefined),
    );
    await expect(service.handleWebhook("{}", "sig")).resolves.toEqual({
      received: true,
    });
  });

  it("lets Stripe retry other signal errors", async () => {
    const { service, signal } = setup("payment_intent.succeeded");
    signal.mockRejectedValue(new Error("Temporal unavailable"));
    await expect(service.handleWebhook("{}", "sig")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("doesn't classify other events", async () => {
    const { service, signal, stripe } = setup("payment_intent.succeeded");
    await service.handleWebhook("{}", "sig");
    expect(stripe.describePaymentFailure).not.toHaveBeenCalled();
    expect(signal.mock.calls[0][1].failure).toBeUndefined();
  });
});
