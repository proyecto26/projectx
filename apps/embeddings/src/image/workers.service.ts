import {
  type BeforeApplicationShutdown,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from "@nestjs/common";
import { SearchRepositoryService } from "@projectx/db";
import type {
  BlobReader,
  Embedder,
  PriorityPermit,
} from "@projectx/embeddings";
import { Context } from "@temporalio/activity";
import { NativeConnection, Worker } from "@temporalio/worker";

import { Limiter } from "../common/limiter";
import {
  type EmbedConfig,
  inWindow,
  TASK_QUEUES,
} from "../config/embed.config";
import { ProfileService } from "../embedder/profile.service";
import {
  BLOB_READER,
  EMBED_CONFIG,
  EMBEDDER,
  PERMIT,
} from "../embedder/tokens";
import { createEmbedAssets } from "./embed-assets";

export type WorkerStatus =
  | "STARTING"
  | "RUNNING"
  | "PAUSED"
  | "STOPPING"
  | "STOPPED"
  | "FAILED";

type Slot = {
  queue: string;
  maxActivities: number;
  worker?: Worker;
  run?: Promise<void>;
  status: WorkerStatus;
  error?: string;
};

/** Checks the bulk ingestion window this often */
const WINDOW_CHECK_MS = 60_000;
/** In-flight items finish; their heartbeat keeps the attempt alive meanwhile */
const SHUTDOWN_GRACE = "2 minutes";

/**
 * Two activity-only workers (no workflows) sharing one inference permit:
 * `embeddings-interactive` (2 concurrent activities) and `embeddings-bulk`
 * (1), the latter stopped outside BULK_INGESTION_WINDOW.
 */
@Injectable()
export class WorkersService
  implements OnApplicationBootstrap, BeforeApplicationShutdown
{
  private readonly logger = new Logger(WorkersService.name);
  private connection?: NativeConnection;
  private windowTimer?: NodeJS.Timeout;
  private stopping = false;
  /** Writes that found the same generation already embedded */
  duplicateInferences = 0;
  private readonly fetches = new Limiter(2);
  private readonly slots: { interactive: Slot; bulk: Slot } = {
    interactive: {
      queue: TASK_QUEUES.interactive,
      maxActivities: 2,
      status: "STOPPED",
    },
    bulk: { queue: TASK_QUEUES.bulk, maxActivities: 1, status: "STOPPED" },
  };

  constructor(
    @Inject(EMBED_CONFIG) private readonly config: EmbedConfig,
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(PERMIT) private readonly permit: PriorityPermit,
    @Inject(BLOB_READER) private readonly blobs: BlobReader,
    @Inject(ProfileService) private readonly profile: ProfileService,
    @Inject(SearchRepositoryService)
    private readonly repository: SearchRepositoryService,
  ) {}

  async onApplicationBootstrap() {
    this.connection = await NativeConnection.connect({
      address: this.config.temporal.address,
    });
    await this.start(this.slots.interactive);
    await this.applyWindow();
    this.windowTimer = setInterval(() => {
      this.applyWindow().catch((error) =>
        this.logger.error(`Bulk window check failed: ${String(error)}`),
      );
    }, WINDOW_CHECK_MS);
  }

  async beforeApplicationShutdown() {
    this.stopping = true;
    clearInterval(this.windowTimer);
    await Promise.all([
      this.stop(this.slots.interactive),
      this.stop(this.slots.bulk),
    ]);
    await this.connection?.close();
  }

  status(): Record<
    "interactive" | "bulk",
    { status: WorkerStatus; error?: string }
  > {
    const view = (slot: Slot) => ({
      status: slot.status,
      ...(slot.error ? { error: slot.error } : {}),
    });
    return {
      interactive: view(this.slots.interactive),
      bulk: view(this.slots.bulk),
    };
  }

  /** Interactive running; bulk running, or paused on purpose outside its window */
  healthy(): boolean {
    const { interactive, bulk } = this.slots;
    return (
      interactive.status === "RUNNING" &&
      (bulk.status === "RUNNING" || bulk.status === "PAUSED")
    );
  }

  private async applyWindow() {
    if (this.stopping) return;
    const open = inWindow(this.config.bulkWindow, new Date());
    const bulk = this.slots.bulk;
    if (open && (bulk.status === "PAUSED" || bulk.status === "STOPPED")) {
      await this.start(bulk);
    } else if (!open && bulk.status === "RUNNING") {
      this.logger.log("Outside BULK_INGESTION_WINDOW: pausing the bulk worker");
      await this.stop(bulk);
      bulk.status = "PAUSED";
    } else if (!open && bulk.status === "STOPPED") {
      bulk.status = "PAUSED";
    }
  }

  private async start(slot: Slot) {
    if (!this.connection) throw new Error("Not connected to Temporal");
    slot.status = "STARTING";
    slot.error = undefined;
    const embedAssets = createEmbedAssets({
      repository: this.repository,
      embedder: this.embedder,
      permit: this.permit,
      blobs: this.blobs,
      fetches: this.fetches,
      profileId: this.profile.profileId,
      onDuplicate: () => {
        this.duplicateInferences += 1;
        Context.current()
          .metricMeter.createCounter("duplicate_inference")
          .add(1);
      },
      log: (message, attrs) =>
        this.logger.warn(`${message} ${JSON.stringify(attrs ?? {})}`),
    });
    const worker = await Worker.create({
      connection: this.connection,
      namespace: this.config.temporal.namespace,
      taskQueue: slot.queue,
      activities: { embedAssets },
      maxConcurrentActivityTaskExecutions: slot.maxActivities,
      shutdownGraceTime: SHUTDOWN_GRACE,
    });
    slot.worker = worker;
    slot.status = "RUNNING";
    this.logger.log(`Worker on ${slot.queue} is running`);
    slot.run = worker.run().then(
      () => {
        if (slot.worker === worker && slot.status !== "PAUSED")
          slot.status = "STOPPED";
      },
      (error: unknown) => {
        if (slot.worker !== worker) return;
        slot.status = "FAILED";
        slot.error = String(error);
        this.logger.error(`Worker on ${slot.queue} failed: ${slot.error}`);
      },
    );
  }

  private async stop(slot: Slot) {
    const { worker, run } = slot;
    if (
      !worker ||
      worker.getState() === "STOPPED" ||
      worker.getState() === "FAILED"
    )
      return;
    slot.status = "STOPPING";
    if (worker.getState() === "RUNNING") worker.shutdown();
    await run;
    slot.worker = undefined;
    slot.status = "STOPPED";
  }
}
