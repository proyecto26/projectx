import { Injectable } from "@nestjs/common";
import type { OrderWorkflowData } from "@projectx/core";

import type { OrderService } from "../order/order.service";

@Injectable()
export class ActivitiesService {
  constructor(public readonly orderService: OrderService) {}

  async createOrder(data: OrderWorkflowData) {
    return await this.orderService.createOrder(data);
  }

  async reportPaymentFailed(orderId: number) {
    return this.orderService.reportPaymentFailed(orderId);
  }

  async reportPaymentConfirmed(orderId: number) {
    return this.orderService.reportPaymentConfirmed(orderId);
  }
}
