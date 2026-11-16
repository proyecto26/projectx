import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import { SearchRepositoryService } from "@projectx/db";
import type { Embedder } from "@projectx/embeddings";

import { EMBEDDER } from "./tokens";

/** Registers the embedder's profile at startup and keeps its id */
@Injectable()
export class ProfileService implements OnModuleInit {
  private id?: number;

  constructor(
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(SearchRepositoryService)
    private readonly repository: SearchRepositoryService,
  ) {}

  async onModuleInit() {
    // A conflicting registration throws: the process must not start
    this.id = await this.repository.ensureProfile(this.embedder.profile());
  }

  /** The id every vector of this process belongs to */
  get profileId(): number {
    if (this.id === undefined)
      throw new Error("The profile is not registered yet");
    return this.id;
  }

  get registered(): boolean {
    return this.id !== undefined;
  }
}
