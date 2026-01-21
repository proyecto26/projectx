import { Module } from "@nestjs/common";
import { OrderSchemaModule } from "./order";
import { PaymentSchemaModule } from "./payment";
import { ProductSchemaModule } from "./product";
import { UserSchemaModule } from "./user";

const providers = [
  UserSchemaModule,
  OrderSchemaModule,
  ProductSchemaModule,
  PaymentSchemaModule,
];

@Module({
  imports: providers,
  exports: providers,
})
export class DbModule {}
