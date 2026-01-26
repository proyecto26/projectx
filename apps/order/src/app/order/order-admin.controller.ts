import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@projectx/core";
import {
  AdminOrderCountsDto,
  AdminOrderDetailDto,
  AdminOrderListQueryDto,
  AdminOrderListResponseDto,
  AdminStatsDto,
  UpdateOrderStatusDto,
} from "./dto";
import { OrderService } from "./order.service";

@ApiTags("orders/admin")
@Controller("orders/admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OrderAdminController {
  constructor(private readonly orderService: OrderService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get dashboard statistics for admin" })
  @ApiResponse({
    status: 200,
    description: "Returns admin dashboard statistics",
    type: AdminStatsDto,
  })
  async getStats(): Promise<AdminStatsDto> {
    return this.orderService.getAdminStats();
  }

  @Get("list")
  @ApiOperation({ summary: "Get paginated list of orders with filtering" })
  @ApiResponse({
    status: 200,
    description: "Returns paginated list of orders",
    type: AdminOrderListResponseDto,
  })
  async getOrderList(
    @Query() query: AdminOrderListQueryDto,
  ): Promise<AdminOrderListResponseDto> {
    return this.orderService.getAdminOrderList(query);
  }

  @Get("counts")
  @ApiOperation({ summary: "Get order counts by status" })
  @ApiResponse({
    status: 200,
    description: "Returns order counts by status",
    type: AdminOrderCountsDto,
  })
  async getOrderCounts(): Promise<AdminOrderCountsDto> {
    return this.orderService.getAdminOrderCounts();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get order details by ID" })
  @ApiParam({ name: "id", description: "Order ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns full order details",
    type: AdminOrderDetailDto,
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async getOrderDetail(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<AdminOrderDetailDto> {
    return this.orderService.getAdminOrderDetail(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update order status" })
  @ApiParam({ name: "id", description: "Order ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "Order status updated successfully",
    type: AdminOrderDetailDto,
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async updateOrderStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<AdminOrderDetailDto> {
    return this.orderService.updateOrderStatus(id, updateStatusDto.status);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel an order" })
  @ApiParam({ name: "id", description: "Order ID", type: Number })
  @ApiResponse({
    status: 200,
    description: "Order cancelled successfully",
    schema: {
      type: "object",
      properties: {
        message: { type: "string", example: "Order cancelled successfully" },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Order cannot be cancelled (already Delivered or Cancelled)",
  })
  @ApiResponse({ status: 404, description: "Order not found" })
  async cancelOrder(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.orderService.cancelOrder(id);
  }
}
