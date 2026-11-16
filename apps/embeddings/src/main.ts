import { Logger, Module } from "@nestjs/common";
import { bootstrapApp } from "@projectx/core";
import { load } from "dotenv-mono";

import { AppModule } from "./app.module";
import { loadEmbedConfig } from "./config/embed.config";

async function main() {
  // The root .env for local runs; compose and deployments set the environment
  load();
  const config = loadEmbedConfig();

  @Module({ imports: [AppModule.forConfig(config)] })
  class RootModule {}

  const app = await bootstrapApp(RootModule);
  // Always (not only in development): workers drain on SIGTERM before exit
  app.enableShutdownHooks();
}

main().catch((err: unknown) => {
  Logger.error(`⚠️ Embeddings failed to start: ${String(err)}`);
  process.exit(1);
});
