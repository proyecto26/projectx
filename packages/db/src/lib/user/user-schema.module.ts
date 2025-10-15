import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma.module";
import { UserRepositoryService } from "./user-repository.service";

@Module({
  imports: [PrismaModule],
  exports: [UserRepositoryService],
  providers: [UserRepositoryService],
})
export class UserSchemaModule {}
