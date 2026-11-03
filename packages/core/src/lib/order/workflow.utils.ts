import type {
  CreateOrderDto,
  OrderPaymentFailure,
  OrderStatusResponseDto,
  PaymentFailureReason,
} from "@projectx/models";
import { defineQuery, defineSignal, defineUpdate } from "@temporalio/workflow";

import type { AuthUser } from "../user";
import type { PaymentProvider } from "./providers";

export type OrderWorkflowData = {
  user: AuthUser;
  order: CreateOrderDto;
};

export const getWorkflowIdByPaymentOrder = (referenceId: string) => {
  return `payment-${referenceId}`;
};

export enum OrderProcessPaymentStatus {
  PENDING = "Pending",
  INITIATED = "Initiated",
  SUCCESS = "Success",
  DECLINED = "Declined",
  CANCELLED = "Cancelled",
  FAILURE = "Failure",
}

export type OrderProcessPaymentState = {
  status: OrderProcessPaymentStatus;
  failure?: OrderPaymentFailure;
};

/**
 * Represents a payment webhook event received from third-party payment providers
 * such as Stripe, MercadoPago, PayU, Wompi, etc.
 */
export type PaymentWebhookEvent = {
  id: string;
  type: string;
  provider: PaymentProvider | `${PaymentProvider}`;
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    metadata: {
      userId: number;
      referenceId: string;
    };
  };
  /** For a failed attempt, already classified by the payment provider adapter */
  failure?: {
    /** Identifies the attempt, so duplicated events count once */
    attempt: string;
    reason: PaymentFailureReason;
    retryable: boolean;
  };
};

export const ORDER_TIMEOUT = "20 minutes";
export const PROCESS_PAYMENT_TIMEOUT = "15 minutes";
/**
 * Failed attempts before the order closes. Customers confirm with Stripe directly,
 * so it's a best-effort limit: Radar is what stops card testing.
 */
export const MAX_PAYMENT_ATTEMPTS = 5;

// DEFINE QUERIES
export const getOrderStateQuery =
  defineQuery<OrderStatusResponseDto>("getOrderState");

// DEFINE SIGNALS
/**
 * Receive a payment webhook event, webhook events is particularly useful for listening to asynchronous events
 * such as when a customer's bank confirms a payment, a customer disputes a charge,
 * a recurring payment succeeds, or when collecting subscription payments.
 */
export const paymentWebHookEventSignal = defineSignal<[PaymentWebhookEvent]>(
  "paymentWebhookEvent",
);

/** Sent by the payment workflow to its parent after each failed attempt */
export const paymentProgressSignal =
  defineSignal<[OrderPaymentFailure]>("paymentProgress");

// DEFINE UPDATES
export const createOrderUpdate = defineUpdate<OrderStatusResponseDto, []>(
  "createOrderUpdate",
) as ReturnType<typeof defineUpdate<OrderStatusResponseDto, []>>;
