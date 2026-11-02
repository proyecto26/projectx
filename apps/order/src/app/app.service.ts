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
  paymentWebHookEventSignal,
} from "@projectx/core";
import type { CreateOrderDto } from "@projectx/models";
import { StripeService } from "@projectx/payment";
import {
  toWorkflowStreamResponse,
  workflowStreamEvents,
} from "@proyecto26/temporal-workflow-client/server";
import { ClientService } from "@proyecto26/temporal-workflows";
import {
  WithStartWorkflowOperation,
  WorkflowNotFoundError,
} from "@temporalio/client";
import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowIdConflictPolicy,
  WorkflowIdReusePolicy,
} from "@temporalio/common";

import { createOrder } from "../workflows/order.workflow";

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly taskQueue: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly clientService: ClientService,
    private readonly stripeService: StripeService,
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

      // Signal the workflow
      await handle.signal(paymentWebHookEventSignal, webhookEvent);

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
