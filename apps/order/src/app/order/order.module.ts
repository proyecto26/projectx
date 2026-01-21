import { Module } from "@nestjs/common";
import { OrderSchemaModule, PaymentSchemaModule } from "@projectx/db";
import { PaymentModule } from "@projectx/payment";

import { OrderService } from "./order.service";

@Module({
  imports: [PaymentModule, OrderSchemaModule, PaymentSchemaModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
