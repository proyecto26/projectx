import { registerAs } from "@nestjs/config";

export interface PaymentConfig {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
}

export default registerAs(
  "payment",
  (): PaymentConfig => ({
    stripeSecretKey: process.env["STRIPE_SECRET_KEY"] ?? "",
    stripeWebhookSecret: process.env["STRIPE_WEBHOOK_SECRET"] ?? "",
  }),
);
