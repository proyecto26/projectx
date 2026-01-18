import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CoreModule, validateConfiguration } from "@projectx/core";
import { DbModule } from "@projectx/db";
import { EmailModule } from "@projectx/email";
import { WorkflowsModule } from "@projectx/workflows";
import path from "path";
import appConfig from "../config/app.config";
import { EnvironmentVariables } from "../config/env.config";
import swaggerConfig from "../config/swagger.config";
import temporalConfig from "../config/temporal.config";
import { ActivitiesModule } from "./activities/activities.module";
import { ActivitiesService } from "./activities/activities.service";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { UserModule } from "./user/user.module";

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
      useFactory: (activitiesService: ActivitiesService) => ({
        activitiesService,
        workflowsPath: path.join(__dirname, "../workflows"),
      }),
      inject: [ActivitiesService],
    }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
