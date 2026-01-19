import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { AuthModule } from "./auth";
import { HealthModule } from "./health";
import { createLoggerOptions } from "./logger";

@Module({
  imports: [
    HealthModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        return {
          pinoHttp: createLoggerOptions(
            configService.get("app.logLevel") ?? "info",
            configService.get("app.apiPrefix") ?? "app",
          ),
        };
      },
    }),
    AuthModule,
  ],
  exports: [AuthModule],
})
export class CoreModule {}
