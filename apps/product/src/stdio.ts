import { NestFactory } from "@nestjs/core";
import { McpStdioLogger, McpStdioServer } from "@nestjs/mcp";

import { AppModule } from "./app/app.module";

/**
 * Serves the product catalog MCP server over stdio, for a client that starts
 * it as a local process. stdout carries the protocol, so every log goes to
 * stderr through McpStdioLogger.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: new McpStdioLogger(),
  });
  // Resolves when the client closes stdin.
  await app.get(McpStdioServer).listen();
  await app.close();
}

bootstrap().catch((err: unknown) => {
  process.stderr.write(`MCP stdio server failed to start: ${String(err)}\n`);
  process.exit(1);
});
