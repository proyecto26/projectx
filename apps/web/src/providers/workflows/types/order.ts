import type { CreateOrderDto, OrderStatusResponseDto } from "@projectx/models";
import type { Workflow } from "./workflow";

export enum OrderStatus {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Shipped = "Shipped",
  Delivered = "Delivered",
  Cancelled = "Cancelled",
  Failed = "Failed",
}

export const OrderSuccessStatus = [
  OrderStatus.Confirmed,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];

export const OrderFailureStatus = [OrderStatus.Failed, OrderStatus.Cancelled];

export type OrderWorkflowData = CreateOrderDto & {
  response?: OrderStatusResponseDto;
};

export type OrderWorkflow = Workflow<OrderWorkflowData>;
