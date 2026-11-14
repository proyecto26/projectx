import { Inject, Injectable } from "@nestjs/common";
import type { OrderWorkflowData } from "@projectx/core";
import type { OrderStatus } from "@projectx/models";

import { OrderService } from "../order/order.service";

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(OrderService) public readonly orderService: OrderService,
  ) {}

  async createOrder(data: OrderWorkflowData) {
    return await this.orderService.createOrder(data);
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
