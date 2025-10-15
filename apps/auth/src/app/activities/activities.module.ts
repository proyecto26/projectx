import { Module } from "@nestjs/common";
import { EmailModule } from "@projectx/email";

import { UserModule } from "../user/user.module";
import { ActivitiesService } from "./activities.service";

@Module({
  imports: [EmailModule, UserModule],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
