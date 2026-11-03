import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreateOrderDto, OrderDto } from "@projectx/models";
import { plainToInstance } from "class-transformer";
import { OrderStatus, Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class OrderRepositoryService {
  private logger = new Logger(OrderRepositoryService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    this.logger.verbose(
      `createOrder(${userId}) - order: ${JSON.stringify(createOrderDto)}`,
    );

    // Idempotency check: Return existing order if it's already created with the same referenceId
    const existingOrder = await this.prisma.order.findUnique({
      where: { referenceId: createOrderDto.referenceId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (existingOrder) {
      this.logger.warn(
        `Order with referenceId ${createOrderDto.referenceId} already exists. Returning existing one.`,
      );
      // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
      return plainToInstance(
        OrderDto,
        JSON.parse(JSON.stringify(existingOrder)),
        {
          excludeExtraneousValues: true,
        },
      );
    }

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
        const estimatedPrice = product.estimatedPrice.toNumber();
        pricesMap[item.productId] = estimatedPrice;
        return acc + estimatedPrice * item.quantity;
      }, 0);

      const order = await tx.order.create({
        data: {
          userId,
          referenceId: createOrderDto.referenceId,
          totalPrice: new Prisma.Decimal(
            totalPrice +
              (createOrderDto.shippingCost || 0) +
              (createOrderDto.taxAmount || 0),
          ),
          taxAmount: new Prisma.Decimal(createOrderDto.taxAmount || 0),
          shippingCost: new Prisma.Decimal(createOrderDto.shippingCost || 0),
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

      // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
      return plainToInstance(OrderDto, JSON.parse(JSON.stringify(order)), {
        excludeExtraneousValues: true,
      });
    });
  }

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<OrderDto> {
    this.logger.verbose(`updateOrderStatus(${orderId}) - status: ${status}`);
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
    return plainToInstance(OrderDto, JSON.parse(JSON.stringify(order)), {
      excludeExtraneousValues: true,
    });
  }

  async getOrderByReferenceId(referenceId: string): Promise<OrderDto | null> {
    this.logger.verbose(`getOrderByReferenceId(${referenceId})`);
    const order = await this.prisma.order.findUnique({
      where: { referenceId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return null;
    }

    // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
    return plainToInstance(OrderDto, JSON.parse(JSON.stringify(order)), {
      excludeExtraneousValues: true,
    });
  }

  async getOrderById(orderId: number): Promise<OrderDto> {
    this.logger.verbose(`getOrderById(${orderId})`);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            quantity: true,
            priceAtPurchase: true,
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                estimatedPrice: true,
              },
            },
          },
        },
        payment: true,
      },
    });

    // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
    return plainToInstance(OrderDto, JSON.parse(JSON.stringify(order)), {
      excludeExtraneousValues: true,
    });
  }
}
