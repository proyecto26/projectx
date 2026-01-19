import { Inject, Injectable, Logger } from "@nestjs/common";
import type { CreateOrderDto } from "@projectx/models";

import { type Order, OrderStatus, Prisma } from "../../../generated/prisma";
import { PrismaService } from "../prisma.service";

@Injectable()
export class OrderRepositoryService {
  private logger = new Logger(OrderRepositoryService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    this.logger.verbose(
      `createOrder(${userId}) - order: ${JSON.stringify(createOrderDto)}`,
    );

    return await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: createOrderDto.items.map((item) => item.productId) },
        },
        select: {
          id: true,
          estimatedPrice: true,
        },
      });
      // Map of productId to price at purchase
      const pricesMap = {} as Record<number, number>;
      // Calculate total price using Prisma.Decimal
      const totalPrice = createOrderDto.items.reduce((acc, item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        pricesMap[item.productId] = product.estimatedPrice.toNumber();
        return acc + product.estimatedPrice.toNumber() * item.quantity;
      }, 0);

      const order = await tx.order.create({
        data: {
          userId,
          referenceId: createOrderDto.referenceId,
          totalPrice: new Prisma.Decimal(totalPrice),
          status: OrderStatus.Pending,
          shippingAddress: createOrderDto.shippingAddress,
          items: {
            create: createOrderDto.items.map((item) => {
              const price = pricesMap[item.productId];
              if (!price) {
                throw new Error(
                  `Price not found for product ID ${item.productId}`,
                );
              }
              return {
                product: {
                  connect: { id: item.productId },
                },
                quantity: item.quantity,
                priceAtPurchase: price,
              };
            }),
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    });
  }

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<Order> {
    this.logger.verbose(`updateOrderStatus(${orderId}) - status: ${status}`);
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}
