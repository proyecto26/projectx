import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { OrderModule } from "../order/order.module";
import { ActivitiesService } from "./activities.service";

@Module({
  imports: [HttpModule, OrderModule],
  providers: [ActivitiesService],
  exports: [ActivitiesService],
})
export class ActivitiesModule {}
