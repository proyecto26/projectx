import { Module } from "@nestjs/common";
import { UserSchemaModule } from "@projectx/db";

import { UserController } from "./user.controller";
import { UserService } from "./user.service";

@Module({
  imports: [UserSchemaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
