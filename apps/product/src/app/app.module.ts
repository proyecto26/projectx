import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { McpModule } from "@nestjs/mcp";
import { CoreModule, validateConfiguration } from "@projectx/core";
import { DbModule } from "@projectx/db";
import appConfig from "../config/app.config";
import { EnvironmentVariables } from "../config/env.config";
import swaggerConfig from "../config/swagger.config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CatalogMcp } from "./mcp/catalog.mcp";
import { productMcpOptions } from "./mcp/mcp.options";

@Module({
  imports: [
    DbModule,
    CoreModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swaggerConfig],
      validate: (config) => validateConfiguration(config, EnvironmentVariables),
    }),
    // Streamable HTTP at /mcp (kept out of the /product prefix by
    // bootstrapApp), and stdio through src/stdio.ts.
    McpModule.forRoot(productMcpOptions),
  ],
  controllers: [AppController],
  providers: [AppService, CatalogMcp],
})
export class AppModule {}
