import { Module } from '@nestjs/common';
import { OrderSchemaModule } from '@projectx/db';
import { PaymentModule } from '@projectx/payment';

import { OrderService } from './order.service';

@Module({
  imports: [PaymentModule, OrderSchemaModule],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
