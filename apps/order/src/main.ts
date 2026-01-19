import { Logger } from "@nestjs/common";
import { bootstrapApp } from "@projectx/core";

import { AppModule } from "./app/app.module";

// Export activities to be used in workflows
export * from "./app/activities/activities.service";

// Enable raw body parsing for webhook events
bootstrapApp(AppModule, { rawBody: true }).catch((err: unknown) => {
  Logger.error(`⚠️ Application failed to start: ${String(err)}`);
  process.exit(1);
});
