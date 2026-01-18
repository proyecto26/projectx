import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OrderWorkflowData } from '@projectx/core';
import { OrderRepositoryService } from '@projectx/db';
import { OrderStatus } from '@projectx/models';
import { StripeService } from '@projectx/payment';

@Injectable()
export class OrderService {
  readonly logger = new Logger(OrderService.name);
  constructor(
    @Inject(StripeService) public readonly stripeService: StripeService,
    @Inject(OrderRepositoryService)
    public readonly orderRepositoryService: OrderRepositoryService,
  ) {}

  async createOrder({ user, order }: OrderWorkflowData) {
    this.logger.log(`createOrder(${user.id})`, order);
    // Create order in database with referenceId
    const newOrder = await this.orderRepositoryService.createOrder(user.id, {
      ...order,
      referenceId: order.referenceId,
    });

    // Create payment intent with Stripe
    const paymentIntent = await this.stripeService.createPaymentIntent(
      Math.round(newOrder.totalPrice.toNumber() * 100), // Convert to cents
      {
        userId: user.id.toString(),
        referenceId: order.referenceId,
        orderId: String(newOrder.id),
      },
    );

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
    // TODO: Send email notification to user about payment failure
    return updatedOrder;
  }

  async reportPaymentConfirmed(orderId: number) {
    this.logger.log(`reportPaymentConfirmed(${orderId})`);
    const updatedOrder = await this.orderRepositoryService.updateOrderStatus(
      orderId,
      OrderStatus.Confirmed,
    );
    // TODO: Send email notification to user about payment confirmation
    return updatedOrder;
  }
}
