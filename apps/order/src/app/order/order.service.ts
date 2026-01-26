import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { OrderWorkflowData } from "@projectx/core";
import {
  OrderRepositoryService,
  PaymentRepositoryService,
  PrismaService,
} from "@projectx/db";
import { OrderStatus, OrderSummaryDto, PaymentStatus } from "@projectx/models";
import { StripeService } from "@projectx/payment";
import type {
  AdminOrderCountsDto,
  AdminOrderDetailDto,
  AdminOrderListQueryDto,
  AdminOrderListResponseDto,
  AdminStatsDto,
} from "./dto";

@Injectable()
export class OrderService {
  readonly logger = new Logger(OrderService.name);
  constructor(
    @Inject(StripeService) public readonly stripeService: StripeService,
    @Inject(OrderRepositoryService)
    public readonly orderRepositoryService: OrderRepositoryService,
    @Inject(PaymentRepositoryService)
    public readonly paymentRepositoryService: PaymentRepositoryService,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async createOrder({ user, order }: OrderWorkflowData) {
    this.logger.log(`createOrder(${user.id})`, order);

    // Idempotency check: Return existing order if already created (handles retries)
    const existingOrder =
      await this.orderRepositoryService.getOrderByReferenceId(
        order.referenceId,
      );

    if (existingOrder?.payment?.transactionId) {
      this.logger.warn(
        `Order with referenceId ${order.referenceId} already exists. Returning existing data.`,
      );
      // Retrieve existing payment intent to get client secret
      const existingPaymentIntent = await this.stripeService.getPaymentIntent(
        existingOrder.payment.transactionId,
      );
      return {
        order: existingOrder,
        clientSecret: existingPaymentIntent.client_secret,
      };
    }

    // Calculate initial breakdown (business logic)
    // In a real app, these might come from a pricing service
    const shippingCost = 10.0;
    const taxAmount = 0; // Let Stripe calculate or use a default

    // Create order in database with referenceId and breakdown
    const newOrder = await this.orderRepositoryService.createOrder(user.id, {
      ...order,
      referenceId: order.referenceId,
      shippingCost,
      taxAmount,
    });

    // Create payment intent with Stripe
    const amountInCents = Math.round(Number(newOrder.totalPrice) * 100);
    this.logger.log(
      `createOrder(${user.id}) - totalPrice: ${newOrder.totalPrice}, amountInCents: ${amountInCents}`,
    );
    const paymentIntent = await this.stripeService.createPaymentIntent(
      {
        amount: amountInCents, // Convert to cents
        metadata: {
          userId: user.id.toString(),
          referenceId: order.referenceId,
          orderId: String(newOrder.id),
          description: `Order ${order.referenceId}`,
        },
        currency: "usd",
      },
      order.referenceId,
    );

    // Create pending payment record
    await this.paymentRepositoryService.createPayment(user.id, {
      orderId: newOrder.id,
      amount: newOrder.totalPrice,
      provider: "Stripe",
      status: PaymentStatus.Pending,
      transactionId: paymentIntent.id,
      paymentMethod: undefined, // Wait for confirmation
    });

    return {
      order: newOrder,
      clientSecret: paymentIntent.client_secret,
    };
  }

  async reportPaymentFailed(orderId: number) {
    this.logger.log(`reportPaymentFailed(${orderId})`);
    const updatedOrder = await this.orderRepositoryService.updateOrderStatus(
      orderId,
      OrderStatus.Failed,
    );

    // Update payment record
    try {
      await this.paymentRepositoryService.updatePaymentStatusByOrderId(
        orderId,
        PaymentStatus.Failed,
      );
    } catch (error) {
      this.logger.error(
        `Error updating payment status for order ${orderId}`,
        error,
      );
    }

    // TODO: Send email notification to user about payment failure
    return updatedOrder;
  }

  async reportPaymentConfirmed(orderId: number) {
    this.logger.log(`reportPaymentConfirmed(${orderId})`);
    const updatedOrder = await this.orderRepositoryService.updateOrderStatus(
      orderId,
      OrderStatus.Confirmed,
    );

    // Update payment record
    try {
      await this.paymentRepositoryService.updatePaymentStatusByOrderId(
        orderId,
        PaymentStatus.Completed,
      );
    } catch (error) {
      this.logger.error(
        `Error updating payment status for order ${orderId}`,
        error,
      );
    }

    // TODO: Send email notification to user about payment confirmation
    return updatedOrder;
  }

  async getOrderSummaryById(orderId: number): Promise<OrderSummaryDto> {
    this.logger.log(`getOrderSummaryById(${orderId})`);
    const order = await this.orderRepositoryService.getOrderById(orderId);

    // Calculate subtotal from line items
    const subtotal =
      order.items?.reduce(
        (acc, item) =>
          acc + Number(item.product?.estimatedPrice || 0) * item.quantity,
        0,
      ) || 0;

    // Initial breakdown from DB records
    const shipping = Number(order.shippingCost || 0);
    let taxes = Number(order.taxAmount || 0);

    const payment = order.payment;
    if (payment?.transactionId) {
      try {
        const paymentIntent = await this.stripeService.getPaymentIntent(
          payment.transactionId,
        );

        // Try to get breakdown from Stripe directly (as a fallback if our calculation differs)
        const totalTaxAmount =
          paymentIntent.amount_details?.tax?.total_tax_amount;
        if (typeof totalTaxAmount === "number" && totalTaxAmount > 0) {
          taxes = totalTaxAmount / 100; // Convert cents to dollars
        }

        const paymentMethod = paymentIntent.payment_method;
        if (paymentMethod && typeof paymentMethod !== "string") {
          // Now we have a proper PaymentMethod object
          if (paymentMethod.card) {
            payment.cardBrand = paymentMethod.card.brand;
            payment.last4 = paymentMethod.card.last4;
            payment.expMonth = paymentMethod.card.exp_month;
            payment.expYear = paymentMethod.card.exp_year;
          }

          if (
            !payment.billingAddress &&
            paymentMethod.billing_details?.address
          ) {
            const addr = paymentMethod.billing_details.address;
            payment.billingAddress = `${paymentMethod.billing_details.name || ""}\n${addr.line1 || ""}${addr.line2 ? `, ${addr.line2}` : ""}\n${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`;
          }
        }

        // Enrich shipping from Stripe if missing
        if (!order.shippingAddress && paymentIntent.shipping?.address) {
          const addr = paymentIntent.shipping.address;
          order.shippingAddress = `${paymentIntent.shipping.name || ""}\n${addr.line1 || ""}${addr.line2 ? `, ${addr.line2}` : ""}\n${addr.city || ""}, ${addr.state || ""} ${addr.postal_code || ""}`;
        }
      } catch (error) {
        this.logger.error(
          `Error enriching order ${orderId} with Stripe info`,
          error,
        );
      }
    }

    const orderSummary = new OrderSummaryDto({
      ...order,
      subtotal,
      shippingCost: shipping,
      taxAmount: taxes,
    });

    return orderSummary;
  }

  async getAdminStats(): Promise<AdminStatsDto> {
    this.logger.log("getAdminStats()");

    // Get aggregate statistics in parallel
    const [orderStats, customerCount, deliveredOrders] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        _avg: { totalPrice: true },
        _count: true,
      }),
      this.prisma.order.findMany({
        select: { userId: true },
        distinct: ["userId"],
      }),
      this.prisma.order.findMany({
        where: {
          status: OrderStatus.Delivered,
        },
        select: {
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Count orders by status
    const [pendingCount, completedCount] = await Promise.all([
      this.prisma.order.count({
        where: { status: OrderStatus.Pending },
      }),
      this.prisma.order.count({
        where: { status: OrderStatus.Delivered },
      }),
    ]);

    const totalOrders = orderStats._count || 0;
    const totalRevenue = Number(orderStats._sum.totalPrice || 0);
    const averageOrderValue = Number(orderStats._avg.totalPrice || 0);
    const totalCustomers = customerCount.length;
    const conversionRate =
      totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;
    const pendingPercentage =
      totalOrders > 0 ? (pendingCount / totalOrders) * 100 : 0;

    // Calculate average delivery time
    let avgDeliveryTime: number | undefined;
    if (deliveredOrders.length > 0) {
      const totalDeliveryTime = deliveredOrders.reduce((acc, order) => {
        const deliveryTimeMs =
          order.updatedAt.getTime() - order.createdAt.getTime();
        return acc + deliveryTimeMs;
      }, 0);
      avgDeliveryTime =
        totalDeliveryTime / deliveredOrders.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      totalRevenue,
      averageOrderValue,
      pendingOrders: pendingCount,
      pendingPercentage,
      completedOrders: completedCount,
      totalCustomers,
      conversionRate,
      avgDeliveryTime,
    };
  }

  async getAdminOrderList(
    query: AdminOrderListQueryDto,
  ): Promise<AdminOrderListResponseDto> {
    this.logger.log("getAdminOrderList()", query);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by status
    if (query.status && query.status !== "all") {
      where.status = query.status as OrderStatus;
    }

    // Search filter
    if (query.search) {
      where.OR = [
        { referenceId: { contains: query.search, mode: "insensitive" } },
        { user: { email: { contains: query.search, mode: "insensitive" } } },
        {
          user: {
            firstName: { contains: query.search, mode: "insensitive" },
          },
        },
        { user: { lastName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    // Fetch orders with pagination
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    // Transform to DTO
    const orderList = orders.map((order) => ({
      id: order.id,
      referenceId: order.referenceId,
      customerName:
        `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() ||
        "N/A",
      customerEmail: order.user.email,
      type: "Standard", // Default type, can be enhanced later
      status: order.status,
      amount: Number(order.totalPrice),
      date: order.createdAt,
    }));

    return {
      orders: orderList,
      total,
      page,
      limit,
    };
  }

  async getAdminOrderCounts(): Promise<AdminOrderCountsDto> {
    this.logger.log("getAdminOrderCounts()");

    const [total, pending, confirmed, shipped, completed] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: OrderStatus.Pending } }),
      this.prisma.order.count({ where: { status: OrderStatus.Confirmed } }),
      this.prisma.order.count({ where: { status: OrderStatus.Shipped } }),
      this.prisma.order.count({ where: { status: OrderStatus.Delivered } }),
    ]);

    // In production = Confirmed + Shipped
    const inProduction = confirmed + shipped;

    return {
      total,
      pending,
      inProduction,
      completed,
    };
  }

  async getAdminOrderDetail(id: number): Promise<AdminOrderDetailDto> {
    this.logger.log(`getAdminOrderDetail(${id})`);

    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Calculate subtotal from line items
    const subtotal =
      order.items?.reduce(
        (acc, item) =>
          acc + Number(item.product?.estimatedPrice || 0) * item.quantity,
        0,
      ) || 0;

    // Transform items to DTO format
    const items = order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name || "Unknown Product",
      quantity: item.quantity,
      price: Number(item.product?.estimatedPrice || 0),
      total: Number(item.product?.estimatedPrice || 0) * item.quantity,
    }));

    // Transform customer info
    const customer = {
      email: order.user.email,
      firstName: order.user.firstName || undefined,
      lastName: order.user.lastName || undefined,
    };

    // Transform payment info if exists
    let payment:
      | {
          status: PaymentStatus;
          amount: number;
          provider: string;
          transactionId?: string;
          paymentMethod?: string;
          billingAddress?: string;
        }
      | undefined;
    if (order.payment) {
      payment = {
        status: order.payment.status as PaymentStatus,
        amount: Number(order.payment.amount),
        provider: order.payment.provider,
        transactionId: order.payment.transactionId || undefined,
        paymentMethod: order.payment.paymentMethod || undefined,
        billingAddress: order.payment.billingAddress || undefined,
      };
    }

    return {
      id: order.id,
      referenceId: order.referenceId,
      status: order.status as OrderStatus,
      totalPrice: Number(order.totalPrice),
      subtotal,
      shippingCost: Number(order.shippingCost || 0),
      taxAmount: Number(order.taxAmount || 0),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      shippingAddress: order.shippingAddress || undefined,
      items,
      customer,
      payment,
    };
  }

  async updateOrderStatus(
    id: number,
    status: OrderStatus,
  ): Promise<AdminOrderDetailDto> {
    this.logger.log(`updateOrderStatus(${id}, ${status})`);

    // Check if order exists
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Update the order status
    await this.orderRepositoryService.updateOrderStatus(id, status);

    // Return the updated order details
    return this.getAdminOrderDetail(id);
  }

  async cancelOrder(id: number): Promise<{ message: string }> {
    this.logger.log(`cancelOrder(${id})`);

    // Check if order exists
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Prevent cancellation of already delivered or cancelled orders
    if (
      existingOrder.status === OrderStatus.Delivered ||
      existingOrder.status === OrderStatus.Cancelled
    ) {
      throw new BadRequestException(
        `Cannot cancel order with status ${existingOrder.status}`,
      );
    }

    // Update order status to Cancelled
    await this.orderRepositoryService.updateOrderStatus(
      id,
      OrderStatus.Cancelled,
    );

    // TODO: Consider refunding payment if it was already processed
    // TODO: Send email notification to customer about cancellation

    return { message: "Order cancelled successfully" };
  }
}
