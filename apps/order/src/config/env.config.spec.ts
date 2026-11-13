import { validateConfiguration } from "@projectx/core";

import { EnvironmentVariables } from "./env.config";

const env = (overrides: Record<string, unknown> = {}) => ({
  NODE_ENV: "development",
  ORDER_PORT: 8082,
  JWT_SECRET: "secret",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  SENDGRID_API_KEY: "SG.123",
  ...overrides,
});

const validate = (overrides?: Record<string, unknown>) => () =>
  validateConfiguration(env(overrides), EnvironmentVariables);

describe("order environment", () => {
  it("accepts a Stripe test key", () => {
    expect(validate()).not.toThrow();
  });

  it("refuses a live key by default", () => {
    expect(validate({ STRIPE_SECRET_KEY: "sk_live_123" })).toThrow(
      /noLiveKeyWithoutAllowLivePayments/,
    );
  });

  it("accepts a live key when live payments are allowed", () => {
    expect(
      validate({
        STRIPE_SECRET_KEY: "sk_live_123",
        ALLOW_LIVE_PAYMENTS: "true",
      }),
    ).not.toThrow();
  });
});
