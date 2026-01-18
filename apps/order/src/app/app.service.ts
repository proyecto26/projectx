import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  type AuthUser,
  cancelWorkflowSignal,
  createOrderUpdate,
  getOrderStateQuery,
  type OrderWorkflowData,
  type PaymentWebhookEvent,
  paymentWebHookEventSignal,
} from '@projectx/core';
import type { CreateOrderDto } from '@projectx/models';
import type { StripeService } from '@projectx/payment';
import {
  type ClientService,
  getWorkflowDescription,
  isWorkflowRunning,
  WORKFLOW_TTL,
} from '@projectx/workflows';
import { WithStartWorkflowOperation } from '@temporalio/client';
import {
  WorkflowExecutionAlreadyStartedError,
  WorkflowIdConflictPolicy,
} from '@temporalio/common';

import { createOrder } from '../workflows/order.workflow';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly taskQueue: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly clientService: ClientService,
    private readonly stripeService: StripeService,
  ) {
    const taskQueue = this.configService.get<string>('temporal.taskQueue');
    if (!taskQueue) {
      throw new Error('Task queue not found');
    }
    this.taskQueue = taskQueue;
  }

  getWorkflowClient() {
    const workflowClient = this.clientService.client?.workflow;
    if (!workflowClient) {
      throw new HttpException(
        'The workflow client was not initialized correctly',
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
        message: 'Order created successfully',
      };
    } catch (error) {
      if (error instanceof WorkflowExecutionAlreadyStartedError) {
        this.logger.warn(
          `createOrder(${user.email}) - workflow already started`,
        );
        throw new HttpException(
          'Order already in progress',
          HttpStatus.CONFLICT,
        );
      }
      this.logger.error(
        `createOrder(${user.email}) - Error creating order`,
        error,
      );
      throw new BadRequestException('Error creating order', {
        cause: error,
      });
    }
  }

  async getOrderStatus(referenceId: string) {
    this.logger.log(`getOrderStatus(${referenceId}) - getting status`);
    const workflowId = this.getWorkflowIdByReferenceId(referenceId);

    const description = await getWorkflowDescription(
      this.getWorkflowClient(),
      workflowId,
    );

    if (!isWorkflowRunning(description)) {
      throw new HttpException('No active order found', HttpStatus.NOT_FOUND);
    }

    if (Date.now() - description.startTime.getTime() >= WORKFLOW_TTL) {
      throw new HttpException('Order has expired', HttpStatus.GONE);
    }

    const handle = this.getWorkflowClient().getHandle(workflowId);
    const state = await handle.query(getOrderStateQuery);
    return state;
  }

  async cancelOrder(referenceId: string) {
    this.logger.log(`cancelOrder(${referenceId}) - cancelling order`);
    const workflowId = this.getWorkflowIdByReferenceId(referenceId);
    const handle = this.getWorkflowClient().getHandle(workflowId);
    await handle.signal(cancelWorkflowSignal);
  }

  async handleWebhook(payload: string | Buffer, signature: string) {
    if (!payload || !signature) {
      this.logger.error(`handleWebhook(${signature}) - No payload received`);
      throw new BadRequestException('No payload received');
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
          'Missing userId or referenceId in payment intent metadata',
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
        provider: 'Stripe',
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
      this.logger.error(`handleWebhook(${signature}) - Webhook Error: ${err}`);
      throw new BadRequestException('Webhook Error', {
        cause: err,
      });
    }
  }
}
