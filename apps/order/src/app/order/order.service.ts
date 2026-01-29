import { Inject, Injectable, Logger } from "@nestjs/common";
import type { OrderWorkflowData } from "@projectx/core";
import { OrderRepositoryService, PaymentRepositoryService } from "@projectx/db";
import { OrderStatus, OrderSummaryDto, PaymentStatus } from "@projectx/models";
import { StripeService } from "@projectx/payment";

@Injectable()
export class OrderService {
  readonly logger = new Logger(OrderService.name);
  constructor(
    @Inject(StripeService) public readonly stripeService: StripeService,
    @Inject(OrderRepositoryService)
    public readonly orderRepositoryService: OrderRepositoryService,
    @Inject(PaymentRepositoryService)
    public readonly paymentRepositoryService: PaymentRepositoryService,
  ) {}

  async createOrder({ user, order }: OrderWorkflowData) {
    this.logger.log(`createOrder(${user.id})`, order);

    // Idempotency check: Return existing order if already created (handles retries)
    const existingOrder =
      await this.orderRepositoryService.getOrderByReferenceId(
        order.referenceId,
      );

    if (existingOrder?.payment?.transactionId) {
      this.logger.warn(
        `Order with referenceId ${order.referenceId} already exists. Returning existing data.`,
      );
      // Retrieve existing payment intent to get client secret
      const existingPaymentIntent = await this.stripeService.getPaymentIntent(
        existingOrder.payment.transactionId,
      );
      return {
        order: existingOrder,
        clientSecret: existingPaymentIntent.client_secret,
      };
    }

    // Calculate initial breakdown (business logic)
    // In a real app, these might come from a pricing service
    const shippingCost = 10.0;
    const taxAmount = 0; // Let Stripe calculate or use a default

    // Create order in database with referenceId and breakdown
    const newOrder = await this.orderRepositoryService.createOrder(user.id, {
      ...order,
      referenceId: order.referenceId,
      shippingCost,
      taxAmount,
    });

    // Create payment intent with Stripe
    const amountInCents = Math.round(Number(newOrder.totalPrice) * 100);
    this.logger.log(
      `createOrder(${user.id}) - totalPrice: ${newOrder.totalPrice}, amountInCents: ${amountInCents}`,
    );
    const paymentIntent = await this.stripeService.createPaymentIntent(
      {
        amount: amountInCents, // Convert to cents
        metadata: {
          userId: user.id.toString(),
          referenceId: order.referenceId,
          orderId: String(newOrder.id),
          description: `Order ${order.referenceId}`,
        },
        currency: "usd",
      },
      order.referenceId,
    );

    // Create pending payment record
    await this.paymentRepositoryService.createPayment(user.id, {
      orderId: newOrder.id,
      amount: newOrder.totalPrice,
      provider: "Stripe",
      status: PaymentStatus.Pending,
      transactionId: paymentIntent.id,
      paymentMethod: undefined, // Wait for confirmation
    });

    return {
      order: newOrder,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async reportPaymentFailed(orderId: number) {
    this.logger.log(`reportPaymentFailed(${orderId})`);
    const updatedOrder = await this.orderRepositoryService.updateOrderStatus(
      orderId,
      OrderStatus.Failed,
    );

    // Update payment record
    try {
      await this.paymentRepositoryService.updatePaymentStatusByOrderId(
        orderId,
        PaymentStatus.Failed,
      );
    } catch (error) {
      this.logger.error(
        `Error updating payment status for order ${orderId}`,
        error,
      );
    }

    // TODO: Send email notification to user about payment failure
    return updatedOrder;
  }

  async reportPaymentConfirmed(orderId: number) {
    this.logger.log(`reportPaymentConfirmed(${orderId})`);
    const updatedOrder = await this.orderRepositoryService.updateOrderStatus(
      orderId,
      OrderStatus.Confirmed,
    );

    // Update payment record
    try {
      await this.paymentRepositoryService.updatePaymentStatusByOrderId(
        orderId,
        PaymentStatus.Completed,
      );
    } catch (error) {
      this.logger.error(
        `Error updating payment status for order ${orderId}`,
        error,
      );
    }

    // TODO: Send email notification to user about payment confirmation
    return updatedOrder;
  }

  async getOrderSummaryById(orderId: number): Promise<OrderSummaryDto> {
    this.logger.log(`getOrderSummaryById(${orderId})`);
    const order = await this.orderRepositoryService.getOrderById(orderId);

    // Calculate subtotal from line items
    const subtotal =
      order.items?.reduce(
        (acc, item) =>
          acc + (item.product?.estimatedPrice || 0) * item.quantity,
        0,
      ) || 0;

    // Initial breakdown from DB records
    const shipping = Number(order.shippingCost || 0);
    let taxes = Number(order.taxAmount || 0);

    const payment = order.payment;
    if (payment?.transactionId) {
      try {
        const paymentIntent = await this.stripeService.getPaymentIntent(
          payment.transactionId,
        );

        // Try to get breakdown from Stripe directly (as a fallback if our calculation differs)
        const totalTaxAmount =
          paymentIntent.amount_details?.tax?.total_tax_amount;
        if (typeof totalTaxAmount === "number" && totalTaxAmount > 0) {
          taxes = totalTaxAmount / 100; // Convert cents to dollars
        }

        const paymentMethod = paymentIntent.payment_method;
        if (paymentMethod && typeof paymentMethod !== "string") {
          // Now we have a proper PaymentMethod object
          if (paymentMethod.card) {
            payment.cardBrand = paymentMethod.card.brand;
            payment.last4 = paymentMethod.card.last4;
            payment.expMonth = paymentMethod.card.exp_month;
            payment.expYear = paymentMethod.card.exp_year;
          }

          if (
            !payment.billingAddress &&
            paymentMethod.billing_details?.address
          ) {
            const addr = paymentMethod.billing_details.address;
            payment.billingAddress = `${paymentMethod.billing_details.name || ""}\n${addr.line1 || ""}${addr.line2 ? `, ${addr.line2}` : ""}\n${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`;
          }
        }

        // Enrich shipping from Stripe if missing
        if (!order.shippingAddress && paymentIntent.shipping?.address) {
          const addr = paymentIntent.shipping.address;
          order.shippingAddress = `${paymentIntent.shipping.name || ""}\n${addr.line1 || ""}${addr.line2 ? `, ${addr.line2}` : ""}\n${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`;
        }
      } catch (error) {
        this.logger.error(
          `Error enriching order ${orderId} with Stripe info`,
          error,
        );
      }
    }

    const orderSummary = new OrderSummaryDto({
      ...order,
      subtotal,
      shippingCost: shipping,
      taxAmount: taxes,
    });

    return orderSummary;
  }
}
