import { Module } from "@nestjs/common";
import {
  OrderSchemaModule,
  PaymentSchemaModule,
  PrismaModule,
} from "@projectx/db";
import { PaymentModule } from "@projectx/payment";
import { OrderService } from "./order.service";
import { OrderAdminController } from "./order-admin.controller";

@Module({
  imports: [
    PaymentModule,
    OrderSchemaModule,
    PaymentSchemaModule,
    PrismaModule,
  ],
  controllers: [OrderAdminController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
