import path from "node:path";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CoreModule, validateConfiguration } from "@projectx/core";
import { DbModule } from "@projectx/db";
import { EmailModule } from "@projectx/email";
import { PaymentModule } from "@projectx/payment";
import { WorkflowsModule } from "@projectx/workflows";
import appConfig from "../config/app.config";
import { EnvironmentVariables } from "../config/env.config";
import swaggerConfig from "../config/swagger.config";
import temporalConfig from "../config/temporal.config";
import { ActivitiesModule } from "./activities/activities.module";
import { ActivitiesService } from "./activities/activities.service";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { OrderModule } from "./order/order.module";

@Module({
  imports: [
    DbModule,
    CoreModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swaggerConfig, temporalConfig],
      validate: (config) => validateConfiguration(config, EnvironmentVariables),
    }),
    EmailModule,
    WorkflowsModule.registerAsync({
      imports: [ActivitiesModule],
      inject: [ActivitiesService],
      useFactory: (activitiesService: ActivitiesService) => ({
        activitiesService,
        workflowsPath: path.join(__dirname, "../workflows"),
      }),
    }),
    PaymentModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
