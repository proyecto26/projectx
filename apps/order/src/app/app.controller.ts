import type { ServerResponse } from "node:http";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
  Post,
  type RawBodyRequest,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticatedUser, type AuthUser, JwtAuthGuard } from "@projectx/core";
import {
  CreateOrderDto,
  OrderDto,
  OrderStatusResponseDto,
} from "@projectx/models";
import { pipeWorkflowResponse } from "@proyecto26/temporal-workflow-client/server";

import { AppService } from "./app.service";
import { OrderService } from "./order/order.service";

@ApiTags("Order")
@Controller()
export class AppController {
  constructor(
    @Inject(AppService) private readonly appService: AppService,
    @Inject(OrderService) private readonly orderService: OrderService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Create a new order and initialize payment",
  })
  @Post()
  async createOrder(
    @AuthenticatedUser() userDto: AuthUser,
    @Body() orderDto: CreateOrderDto,
  ) {
    return this.appService.createOrder(userDto, orderDto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get order by id",
  })
  @ApiParam({
    name: "orderId",
    required: true,
    type: String,
    description: "Order ID",
    example: "1",
  })
  @ApiOkResponse({
    description: "Returns the order",
    type: OrderDto,
  })
  @HttpCode(HttpStatus.OK)
  @Get("summary/:orderId")
  async getOrderSummaryById(
    @AuthenticatedUser() user: AuthUser,
    @Param("orderId", ParseIntPipe) orderId: number,
  ) {
    return this.orderService.getOrderSummaryById(orderId, user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Check status of the order workflow",
  })
  @ApiParam({
    name: "referenceId",
    required: true,
    type: String,
    description: "Reference ID of the order",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @ApiOkResponse({
    description: "Returns the status of the order workflow",
    type: OrderStatusResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @Get("status/:referenceId")
  async getOrderStatus(
    @AuthenticatedUser() user: AuthUser,
    @Param("referenceId") referenceId: string,
  ) {
    return this.appService.getOrderStatus(user, referenceId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Follow the status of the order workflow",
    description:
      "Server-Sent Events with the state of the order until the workflow closes",
  })
  @ApiParam({
    name: "referenceId",
    required: true,
    type: String,
    description: "Reference ID of the order",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @Get("stream/:referenceId")
  async streamOrderStatus(
    @AuthenticatedUser() user: AuthUser,
    @Param("referenceId") referenceId: string,
    @Res() res: ServerResponse,
  ) {
    const controller = new AbortController();
    res.once("close", () => controller.abort());
    const response = await this.appService.streamOrderStatus(
      user,
      referenceId,
      controller.signal,
    );
    await pipeWorkflowResponse(response, res);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Cancel an order",
  })
  @Delete(":referenceId")
  async cancelOrder(
    @AuthenticatedUser() user: AuthUser,
    @Param("referenceId") referenceId: string,
  ) {
    return this.appService.cancelOrder(user, referenceId);
  }

  @ApiOperation({
    summary: "Handle Stripe webhook events",
    description:
      "Endpoint for receiving webhook events from Stripe for payment processing",
  })
  @ApiHeader({
    name: "stripe-signature",
    description: "Stripe signature for webhook event verification",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Webhook event processed successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid payload or signature",
  })
  @HttpCode(HttpStatus.OK)
  @Post("/webhook")
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    // Validate and process the webhook
    if (!request.rawBody) {
      throw new BadRequestException("Request body is empty");
    }
    return this.appService.handleWebhook(request.rawBody, signature);
  }
}
