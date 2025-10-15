import { Module } from "@nestjs/common";
import { OrderSchemaModule } from "./order";
import { ProductSchemaModule } from "./product";
import { UserSchemaModule } from "./user";

const providers = [UserSchemaModule, OrderSchemaModule, ProductSchemaModule];

@Module({
  imports: providers,
  exports: providers,
})
export class DbModule {}
