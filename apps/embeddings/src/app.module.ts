import { type DynamicModule, Module, type Provider } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { createLoggerOptions } from "@projectx/core";
import { PriorityPermit, S3BlobReader } from "@projectx/embeddings";
import { LoggerModule } from "nestjs-pino";

import type { EmbedConfig } from "./config/embed.config";
import { EmbedderModule } from "./embedder/embedder.module";
import { BLOB_READER, PERMIT } from "./embedder/tokens";
import { HealthController } from "./health/health.controller";
import { ImageController } from "./image/image.controller";
import { WorkersService } from "./image/workers.service";
import { TextController } from "./text/text.controller";

/** One image, two roles: `text` serves queries, `image` also runs the workers */
@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: This is a standard NestJS pattern for dynamic modules.
export class AppModule {
  static forConfig(config: EmbedConfig): DynamicModule {
    const image = config.role === "image";
    const providers: Provider[] = image
      ? [
          { provide: PERMIT, useValue: new PriorityPermit() },
          { provide: BLOB_READER, useValue: new S3BlobReader(config.s3) },
          WorkersService,
        ]
      : [];
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              app: {
                port: config.port,
                environment: config.environment,
                apiPrefix: "embed",
                allowedOrigins: [],
                logLevel: process.env.LOG_LEVEL ?? "info",
              },
              swagger: {
                title: "Embeddings API",
                description: `Embeddings (${config.role} role), internal network only`,
                version: "1.0",
              },
            }),
          ],
        }),
        LoggerModule.forRoot({
          pinoHttp: createLoggerOptions(
            process.env.LOG_LEVEL ?? "info",
            `embed-${config.role}`,
          ),
        }),
        EmbedderModule.forConfig(config),
      ],
      controllers: [HealthController, image ? ImageController : TextController],
      providers,
    };
  }
}
