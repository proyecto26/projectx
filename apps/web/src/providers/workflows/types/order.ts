import type {
  CreateOrderDto,
  OrderCreateResponseDto,
  OrderStatusResponseDto,
} from "@projectx/models";
import type { WorkflowSessionSnapshot } from "@proyecto26/temporal-workflow-client";

export enum OrderStatus {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Shipped = "Shipped",
  Delivered = "Delivered",
  Cancelled = "Cancelled",
  Failed = "Failed",
}

export const OrderSuccessStatus: string[] = [
  OrderStatus.Confirmed,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
];

export const OrderFailureStatus: string[] = [
  OrderStatus.Failed,
  OrderStatus.Cancelled,
];

export type OrderWorkflowState = OrderStatusResponseDto;
export type OrderWorkflowInput = CreateOrderDto;
export type OrderWorkflowResult = OrderCreateResponseDto;
export type OrderWorkflow = WorkflowSessionSnapshot<
  OrderWorkflowState,
  OrderWorkflowResult
>;
