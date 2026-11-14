import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";

import type { PaymentConfig } from "../../config";

import {
  classifyPaymentFailure,
  type PaymentFailureClassification,
} from "./payment-failure";

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const config = this.configService.get<PaymentConfig>("payment");
    if (!config) {
      throw new InternalServerErrorException(
        "Payment configuration is not loaded",
      );
    }
    const { stripeSecretKey } = config;
    if (!stripeSecretKey) {
      throw new InternalServerErrorException(
        "STRIPE_SECRET_KEY is not configured",
      );
    }
    this.stripe = new Stripe(stripeSecretKey, {
      typescript: true,
    });
  }

  async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
    } catch (error) {
      this.logger.error(`Error retrieving payment intent: ${error}`);
      throw new InternalServerErrorException(
        "Error retrieving payment intent",
        {
          cause: error,
        },
      );
    }
  }

  async createPaymentIntent(
    options: Stripe.PaymentIntentCreateParams,
    idempotencyKey?: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create(
        {
          automatic_payment_methods: {
            enabled: true,
          },
          ...options,
        },
        idempotencyKey ? { idempotencyKey } : undefined,
      );
    } catch (error) {
      this.logger.error(`Error creating payment intent: ${error}`);
      throw new InternalServerErrorException("Error creating payment intent", {
        cause: error,
      });
    }
  }

  async updatePaymentIntent(
    paymentIntentId: string,
    data: Stripe.PaymentIntentUpdateParams,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.update(paymentIntentId, data);
    } catch (error) {
      this.logger.error(`Error updating payment intent: ${error}`);
      throw new InternalServerErrorException("Error updating payment intent", {
        cause: error,
      });
    }
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.cancel(paymentIntentId);
  }

  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const config = this.configService.get<PaymentConfig>("payment");
    if (!config) {
      throw new InternalServerErrorException(
        "Payment configuration is not loaded",
      );
    }
    const { stripeWebhookSecret } = config;
    if (!stripeWebhookSecret) {
      throw new InternalServerErrorException(
        "STRIPE_WEBHOOK_SECRET is not configured",
      );
    }
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeWebhookSecret,
      );
      return event;
    } catch (error) {
      this.logger.error(`Error constructing webhook event: ${error}`);
      throw new InternalServerErrorException(
        "Error constructing webhook event",
        {
          cause: error,
        },
      );
    }
  }

  handleWebhookEvent(event: Stripe.Event) {
    let paymentIntent: Stripe.PaymentIntent | undefined;

    switch (event.type) {
      case "payment_intent.created":
        paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `handleWebhookEvent(${paymentIntent.id}) - Payment intent created:`,
        );
        break;
      case "payment_intent.succeeded":
        paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `handleWebhookEvent(${paymentIntent.id}) - Payment succeeded:`,
        );
        break;
      // Let the workflow know about an attempt in progress, and a cancellation
      case "payment_intent.processing":
      case "payment_intent.canceled":
        paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `handleWebhookEvent(${paymentIntent.id}) - ${event.type}`,
        );
        break;
      case "payment_intent.payment_failed":
        paymentIntent = event.data.object as Stripe.PaymentIntent;
        this.logger.log(
          `handleWebhookEvent(${paymentIntent.id}) - Payment failed:`,
        );
        break;
      // Add more event types as needed
      default:
        this.logger.error(
          `handleWebhookEvent(${paymentIntent?.id}) - Unhandled event type: ${event.type}`,
        );
    }

    return paymentIntent;
  }

  /**
   * Classifies the last failed attempt of a payment intent. It reads the charge to
   * know if Radar blocked it, and throws if it can't, so that a fraud block is
   * never taken for a decline the customer can retry.
   */
  async describePaymentFailure(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<
    (PaymentFailureClassification & { attempt?: string }) | undefined
  > {
    const error = paymentIntent.last_payment_error;
    if (!error) return undefined;
    const chargeId =
      typeof error.charge === "string" ? error.charge : undefined;
    const outcome = chargeId
      ? (await this.stripe.charges.retrieve(chargeId)).outcome
      : null;
    return {
      attempt: chargeId,
      ...classifyPaymentFailure({
        code: error.code,
        declineCode: error.decline_code,
        outcomeType: outcome?.type,
        outcomeReason: outcome?.reason,
        riskLevel: outcome?.risk_level,
      }),
    };
  }

  async refundPaymentIntent(
    paymentIntentId: string,
    amount?: number,
  ): Promise<Stripe.Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
      });
      this.logger.log(
        `refundPaymentIntent(${paymentIntentId}) - Refund created: ${refund.id}`,
      );
      return refund;
    } catch (error) {
      this.logger.error(`Error refunding payment intent: ${error}`);
      throw new InternalServerErrorException("Error refunding payment intent", {
        cause: error,
      });
    }
  }
}
