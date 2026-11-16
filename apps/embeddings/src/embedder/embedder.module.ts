import { type DynamicModule, Logger, Module } from "@nestjs/common";
import { SearchSchemaModule } from "@projectx/db";
import {
  type Embedder,
  FakeEmbedder,
  MODEL_LOCK,
  TransformersEmbedder,
} from "@projectx/embeddings";

import type { EmbedConfig } from "../config/embed.config";
import { ProfileService } from "./profile.service";
import { EMBED_CONFIG, EMBEDDER } from "./tokens";

/**
 * The embedder for the role (text-only session for `text`, vision + text for
 * `image`), loaded from the verified model cache, and its registered profile.
 * Startup fails (exit 1) on missing or different weights, or on a profile
 * that conflicts with the registered one.
 */
@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: This is a standard NestJS pattern for dynamic modules.
export class EmbedderModule {
  static forConfig(config: EmbedConfig): DynamicModule {
    return {
      module: EmbedderModule,
      global: true,
      imports: [SearchSchemaModule],
      providers: [
        { provide: EMBED_CONFIG, useValue: config },
        {
          provide: EMBEDDER,
          useFactory: async (): Promise<Embedder> => {
            const embedder = createEmbedder(config);
            await embedder.ready();
            new Logger("Embedder").log(
              `Model ready: ${JSON.stringify(embedder.profile())}`,
            );
            return embedder;
          },
        },
        ProfileService,
      ],
      exports: [EMBED_CONFIG, EMBEDDER, ProfileService, SearchSchemaModule],
    };
  }
}

export function createEmbedder(config: EmbedConfig): Embedder {
  if (config.embedder === "fake") return new FakeEmbedder();
  return new TransformersEmbedder({
    mode: config.role === "text" ? "text" : "full",
    cacheDir: config.modelCacheDir,
    lock: MODEL_LOCK,
    threads: config.threads,
  });
}
