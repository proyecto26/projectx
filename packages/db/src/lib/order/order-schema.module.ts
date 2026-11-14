import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { OrderRepositoryService } from "./order-repository.service";

@Module({
  imports: [PrismaModule],
  exports: [OrderRepositoryService],
  providers: [OrderRepositoryService],
})
export class OrderSchemaModule {}
