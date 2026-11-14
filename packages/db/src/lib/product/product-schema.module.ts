import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { ProductRepositoryService } from "./product-repository.service";

@Module({
  imports: [PrismaModule],
  exports: [ProductRepositoryService],
  providers: [ProductRepositoryService],
})
export class ProductSchemaModule {}
