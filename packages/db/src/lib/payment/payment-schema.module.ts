import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { PaymentRepositoryService } from "./payment-repository.service";

@Module({
  imports: [PrismaModule],
  exports: [PaymentRepositoryService],
  providers: [PaymentRepositoryService],
})
export class PaymentSchemaModule {}
