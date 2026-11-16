import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Embedder } from "@projectx/embeddings";

import type { EmbedConfig } from "../config/embed.config";
import { ProfileService } from "../embedder/profile.service";
import { EMBED_CONFIG, EMBEDDER } from "../embedder/tokens";
import { WorkersService } from "../image/workers.service";

/**
 * 200 once the model is loaded (warm-up included) and the profile is
 * registered; for the image role also the interactive worker running and the
 * bulk worker running or paused outside its window.
 */
@Controller("health")
export class HealthController {
  constructor(
    @Inject(EMBED_CONFIG) private readonly config: EmbedConfig,
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(ProfileService) private readonly profile: ProfileService,
    @Optional()
    @Inject(WorkersService)
    private readonly workers?: WorkersService,
  ) {}

  @Get()
  check() {
    const model = this.profile.registered ? "ready" : "loading";
    const details = {
      role: this.config.role,
      model,
      profileId: this.profile.registered ? this.profile.profileId : null,
      imageTokenBudget: this.embedder.profile().imageTokenBudget,
      ...(this.workers
        ? {
            workers: this.workers.status(),
            duplicateInferences: this.workers.duplicateInferences,
          }
        : {}),
    };
    const ok =
      model === "ready" &&
      (this.config.role === "text" || this.workers?.healthy() === true);
    if (!ok)
      throw new ServiceUnavailableException({ status: "down", ...details });
    return { status: "up", ...details };
  }
}
