import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type AuthUser,
  cancelWorkflowSignal,
  createOrderUpdate,
  getOrderStateQuery,
  type OrderWorkflowData,
  type PaymentWebhookEvent,
  PRODUCT_UNAVAILABLE,
  paymentWebHookEventSignal,
} from "@projectx/core";
import { OrderRepositoryService } from "@projectx/db";
import type { CreateOrderDto } from "@projectx/models";
import { orderActions } from "@projectx/models/workflows";
import { StripeService } from "@projectx/payment";
import {
  defineServerActions,
  signalAction,
  toWorkflowStreamResponse,
  workflowStreamEvents,
} from "@proyecto26/temporal-workflow-client/server";
import { ClientService } from "@proyecto26/temporal-workflows";
import {
  WithStartWorkflowOperation,
  WorkflowNotFoundError,
} from "@temporalio/client";
import {
  ApplicationFailure,
  WorkflowExecutionAlreadyStartedError,
  WorkflowIdConflictPolicy,
  WorkflowIdReusePolicy,
} from "@temporalio/common";

import { createOrder } from "../workflows/order.workflow";

const orderServerActions = defineServerActions(orderActions, {
  cancel: signalAction(cancelWorkflowSignal),
});

/** Ids of the products that can't be sold, found anywhere in the failure's causes */
export function unavailableProductIds(error: unknown): number[] | undefined {
  for (
    let current: unknown = error;
    current instanceof Error;
    // Temporal errors set cause, the build targets a lib without Error.cause
    current = (current as { cause?: unknown }).cause
  ) {
    if (
      current instanceof ApplicationFailure &&
      current.type === PRODUCT_UNAVAILABLE
    ) {
      const [details] = current.details ?? [];
      const ids = (details as { productIds?: unknown } | undefined)?.productIds;
      return Array.isArray(ids)
        ? ids.filter((id): id is number => typeof id === "number")
        : [];
    }
  }
  return undefined;
}

/** Error code clients get in the 400 body, separate from the Temporal failure type */
export const PRODUCT_UNAVAILABLE_CODE = "PRODUCT_UNAVAILABLE";

const productUnavailable = (productIds: number[]) =>
  new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    code: PRODUCT_UNAVAILABLE_CODE,
    message: "Some products in the cart aren't available anymore",
    productIds,
  });

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly taskQueue: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly clientService: ClientService,
    private readonly stripeService: StripeService,
    private readonly orderRepository: OrderRepositoryService,
  ) {
    const taskQueue = this.configService.get<string>("temporal.taskQueue");
    if (!taskQueue) {
      throw new Error("Task queue not found");
    }
    this.taskQueue = taskQueue;
  }

  getWorkflowClient() {
    const workflowClient = this.clientService.client?.workflow;
    if (!workflowClient) {
      throw new HttpException(
        "The workflow client was not initialized correctly",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return workflowClient;
  }

  getWorkflowIdByReferenceId(referenceId: string) {
    return `order-${referenceId}`;
  }

  async createOrder(user: AuthUser, orderDto: CreateOrderDto) {
    this.logger.log(`createOrder(${user.email}) - creating order`);
    // Checked before starting anything, so a stale cart gets a clear answer
    const unavailable = await this.orderRepository.findUnavailableProductIds(
      orderDto.items.map((item) => item.productId),
    );
    if (unavailable.length > 0) {
      throw productUnavailable(unavailable);
    }
    try {
      // Start workflow with order data
      const workflowData: OrderWorkflowData = {
        user,
        order: orderDto,
      };

      const startWorkflowOperation = new WithStartWorkflowOperation(
        createOrder,
        {
          workflowId: this.getWorkflowIdByReferenceId(orderDto.referenceId),
          args: [workflowData],
          taskQueue: this.taskQueue,
          workflowIdConflictPolicy: WorkflowIdConflictPolicy.FAIL,
          // A referenceId is one purchase, so a closed order can't run again
          workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
          searchAttributes: {
            UserId: [user.id],
            Email: [user.email],
          },
        },
      );

      const state = await this.getWorkflowClient().executeUpdateWithStart(
        createOrderUpdate,
        {
          startWorkflowOperation,
        },
      );

      return {
        orderId: state.orderId,
        referenceId: state.referenceId,
        clientSecret: state.clientSecret,
        message: "Order created successfully",
      };
    } catch (error) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        this.logger.warn(
          `createOrder(${user.email}) - workflow already started`,
        );
        throw new HttpException(
          "Order already in progress",
          HttpStatus.CONFLICT,
        );
      }
      // Discontinued between the check above and the activity
      const productIds = unavailableProductIds(error);
      if (productIds) {
        throw productUnavailable(productIds);
      }
      this.logger.error(
        `createOrder(${user.email}) - Error creating order`,
        error,
      );
      throw new BadRequestException("Error creating order", {
        cause: error,
      });
    }
  }

  /**
   * Get the workflow of an order only if it belongs to the user.
   * A missing workflow and someone else's workflow look the same to the caller.
   */
  async getOwnedWorkflowHandle(user: AuthUser, referenceId: string) {
    const handle = this.getWorkflowClient().getHandle(
      this.getWorkflowIdByReferenceId(referenceId),
    );
    let ownerId: unknown;
    try {
      const description = await handle.describe();
      ownerId = description.searchAttributes?.UserId?.[0];
    } catch (error) {
      if (error instanceof WorkflowNotFoundError) {
        throw new NotFoundException("Order not found");
      }
      throw error;
    }
    if (ownerId === undefined || `${ownerId}` !== `${user.id}`) {
      throw new NotFoundException("Order not found");
    }
    return handle;
  }

  async getOrderStatus(user: AuthUser, referenceId: string) {
    this.logger.log(`getOrderStatus(${referenceId}) - getting status`);
    const handle = await this.getOwnedWorkflowHandle(user, referenceId);
    const state = await handle.query(getOrderStateQuery);
    return state;
  }

  /** The state of an order as Server-Sent Events, until the workflow closes. */
  async streamOrderStatus(
    user: AuthUser,
    referenceId: string,
    signal: AbortSignal,
  ) {
    this.logger.log(`streamOrderStatus(${referenceId}) - streaming status`);
    await this.getOwnedWorkflowHandle(user, referenceId);
    const { client } = this.clientService;
    if (!client) {
      throw new HttpException(
        "The workflow client was not initialized correctly",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return toWorkflowStreamResponse(
      workflowStreamEvents({
        client,
        workflowId: this.getWorkflowIdByReferenceId(referenceId),
        getState: (handle) => handle.query(getOrderStateQuery),
        signal,
      }),
      {
        onError: (error) =>
          this.logger.error(`streamOrderStatus(${referenceId}) failed`, error),
      },
    );
  }

  /** Runs what the frontend can ask a running order to do. */
  async sendOrderAction(
    user: AuthUser,
    referenceId: string,
    action: string,
    actionId?: string,
  ) {
    this.logger.log(`sendOrderAction(${referenceId}) - ${action}`);
    const handle = await this.getOwnedWorkflowHandle(user, referenceId);
    // No action takes an input yet. Validate it here when one does
    return orderServerActions.handle({ handle, name: action, actionId });
  }

  async cancelOrder(user: AuthUser, referenceId: string) {
    this.logger.log(`cancelOrder(${referenceId}) - cancelling order`);
    const handle = await this.getOwnedWorkflowHandle(user, referenceId);
    await handle.signal(cancelWorkflowSignal);
  }

  async handleWebhook(payload: string | Buffer, signature: string) {
    if (!payload || !signature) {
      this.logger.error(`handleWebhook(${signature}) - No payload received`);
      throw new BadRequestException("No payload received");
    }
    this.logger.log(`handleWebhook(${signature}) - Processing webhook event`);
    try {
      // Verify and construct the webhook event
      const event = this.stripeService.constructWebhookEvent(
        payload,
        signature,
      );

      // Extract payment intent data
      const paymentIntent = this.stripeService.handleWebhookEvent(event);
      if (!paymentIntent?.metadata) {
        this.logger.error(
          `handleWebhook(${signature}) - Unhandled event type: ${event.type}`,
        );
        return { received: true };
      }
      const { userId, referenceId } = paymentIntent.metadata;

      if (!userId || !referenceId) {
        this.logger.error(
          "Missing userId or referenceId in payment intent metadata",
        );
        return { received: true };
      }

      // Get workflow handle
      const workflowId = this.getWorkflowIdByReferenceId(referenceId);
      const handle = this.getWorkflowClient().getHandle(workflowId);

      // Convert Stripe event to PaymentWebhookEvent
      const webhookEvent: PaymentWebhookEvent = {
        id: event.id,
        type: event.type,
        provider: "Stripe",
        data: {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          metadata: {
            userId: Number(userId),
            referenceId: referenceId,
          },
        },
      };

      // Classified here, as the workflow knows nothing about Stripe. It throws if
      // Stripe can't tell, so Stripe sends the event again later
      if (event.type === "payment_intent.payment_failed") {
        const failure =
          await this.stripeService.describePaymentFailure(paymentIntent);
        webhookEvent.failure = failure && {
          attempt: failure.attempt ?? event.id,
          reason: failure.reason,
          retryable: failure.retryable,
        };
      }

      // Signal the workflow
      try {
        await handle.signal(paymentWebHookEventSignal, webhookEvent);
      } catch (error) {
        // It closed after settling the payment with Stripe, so there's nothing left
        // to tell it. Stripe would otherwise send it again for days
        if (error instanceof WorkflowNotFoundError) {
          this.logger.warn(
            `handleWebhook(${event.id}) - ${event.type} for a closed order ${referenceId}`,
          );
          return { received: true };
        }
        throw error;
      }

      // Return true to indicate the webhook was received
      return { received: true };
    } catch (err) {
      this.logger.error(
        `handleWebhook(${signature}) - Webhook Error: ${String(err)}`,
      );
      throw new BadRequestException("Webhook Error", {
        cause: err,
      });
    }
  }
}
