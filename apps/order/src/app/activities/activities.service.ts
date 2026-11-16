import { Inject, Injectable } from "@nestjs/common";
import { type OrderWorkflowData, PRODUCT_UNAVAILABLE } from "@projectx/core";
import { type OrderStatus, ProductUnavailableError } from "@projectx/models";
import { ApplicationFailure } from "@temporalio/common";

import { OrderService } from "../order/order.service";

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(OrderService) public readonly orderService: OrderService,
  ) {}

  async createOrder(data: OrderWorkflowData) {
    try {
      return await this.orderService.createOrder(data);
    } catch (error) {
      // Retrying can't make a discontinued product available again
      if (error instanceof ProductUnavailableError) {
        throw ApplicationFailure.nonRetryable(
          error.message,
          PRODUCT_UNAVAILABLE,
          { productIds: error.productIds },
        );
      }
      throw error;
    }
  }

  async cancelPayment(referenceId: string) {
    return this.orderService.cancelPayment(referenceId);
  }

  async reportPaymentFailed(
    orderId: number,
    status?: OrderStatus.Failed | OrderStatus.Cancelled,
  ) {
    return this.orderService.reportPaymentFailed(orderId, status);
  }

  async reportPaymentConfirmed(orderId: number) {
    return this.orderService.reportPaymentConfirmed(orderId);
  }
}
