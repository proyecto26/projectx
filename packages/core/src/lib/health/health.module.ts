import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { PrismaModule } from "@projectx/db";

import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    TerminusModule.forRoot({
      errorLogStyle: "pretty",
      gracefulShutdownTimeoutMs: 1000,
    }),
  ],
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {}
