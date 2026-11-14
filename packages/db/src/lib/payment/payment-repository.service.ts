import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreatePaymentDto, PaymentDto } from "@projectx/models";

import { plainToInstance } from "class-transformer";
import { PaymentStatus, Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class PaymentRepositoryService {
  private logger = new Logger(PaymentRepositoryService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createPayment(userId: number, createPaymentDto: CreatePaymentDto) {
    this.logger.verbose(
      `createPayment(${userId}) - payment: ${JSON.stringify(createPaymentDto)}`,
    );

    const payment = await this.prisma.payment.create({
      data: {
        orderId: createPaymentDto.orderId,
        provider: createPaymentDto.provider,
        status: createPaymentDto.status as PaymentStatus,
        transactionId: createPaymentDto.transactionId,
        amount: new Prisma.Decimal(createPaymentDto.amount),
        paymentMethod: createPaymentDto.paymentMethod,
        billingAddress: createPaymentDto.billingAddress,
      },
    });

    // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
    return plainToInstance(PaymentDto, JSON.parse(JSON.stringify(payment)), {
      excludeExtraneousValues: true,
    });
  }

  async updatePaymentStatusByOrderId(orderId: number, status: PaymentStatus) {
    this.logger.verbose(
      `updatePaymentStatusByOrderId(${orderId}) - status: ${status}`,
    );
    const payment = await this.prisma.payment.update({
      where: { orderId },
      data: { status },
    });
    // JSON.parse(JSON.stringify()) converts Prisma Decimal to string via toJSON()
    return plainToInstance(PaymentDto, JSON.parse(JSON.stringify(payment)), {
      excludeExtraneousValues: true,
    });
  }
}
