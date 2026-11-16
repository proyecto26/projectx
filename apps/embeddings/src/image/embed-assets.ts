import type { ErrorCode, Fence, SearchRepositoryService } from "@projectx/db";
import {
  BlobReadError,
  type BlobReader,
  type Embedder,
  ImageDecodeError,
  type Lane,
  type PriorityPermit,
} from "@projectx/embeddings";
import {
  ApplicationFailure,
  CancelledFailure,
  Context,
} from "@temporalio/activity";

import { Limiter } from "../common/limiter";

/** Items per call: 500 results stay far below Temporal's 256 KB payload limit */
export const MAX_ITEMS = 500;
/** Liveness heartbeat, independent of the database (EMBEDDINGS_SERVICE.md, Per item) */
export const HEARTBEAT_EVERY_MS = 10_000;
/** How often the repair deadline of pending items is pushed ahead */
export const DEFER_EVERY_MS = 5 * 60_000;
export const DEFER_SECONDS = 15 * 60;

export type EmbedAssetsInput = {
  items: Fence[];
  profileId: number;
  /** The dispatch this run belongs to (`<workflowId>/<runId>/<seq>`), as given to beginAttempt */
  dispatchId: string;
};

export type SkipReason =
  | "missing"
  | "deleted"
  | "stale"
  | "not_ready"
  | "pending";

export type EmbedAssetsResult = {
  embedded: number;
  failed: { assetId: number; code: ErrorCode; retryable: boolean }[];
  skipped: { assetId: number; reason: SkipReason }[];
};

/** The repository methods the embedding path uses */
export type EmbeddingRepository = Pick<
  SearchRepositoryService,
  | "embeddingInput"
  | "markStored"
  | "writeEmbedding"
  | "markFailed"
  | "deferRepair"
  | "batchOutcome"
>;

export type EmbedAssetsDeps = {
  repository: EmbeddingRepository;
  embedder: Embedder;
  permit: PriorityPermit;
  blobs: BlobReader;
  /** Shared by every activity of the process (2 concurrent reads) */
  fetches: Limiter;
  /** The id this worker registered for its embedder's profile */
  profileId: number;
  /** Timers, overridable in tests */
  heartbeatEveryMs?: number;
  deferEveryMs?: number;
  onDuplicate?: () => void;
  log?: (message: string, attrs?: Record<string, unknown>) => void;
};

/** Retryable codes; every other code recorded here is terminal */
const RETRYABLE: ReadonlySet<ErrorCode> = new Set([
  "fetch_timeout",
  "storage_unavailable",
  "inference_failed",
]);

/** What the next step needs for one item, or nothing to do */
type Prepared =
  | { kind: "done" }
  | { kind: "embed"; fence: Fence; blobId: number; bytes: Uint8Array }
  | {
      kind: "failed";
      fence: Fence;
      blobId: number;
      code: ErrorCode;
      error: unknown;
    };

/**
 * The `embedAssets` activity: embeds stored images and writes their vectors.
 * Correctness never depends on this attempt finishing: every write is fenced
 * and idempotent, and the result is read from the database at the end.
 */
export function createEmbedAssets(deps: EmbedAssetsDeps) {
  return async function embedAssets(
    input: EmbedAssetsInput,
  ): Promise<EmbedAssetsResult> {
    const context = Context.current();
    validate(input, deps.profileId);
    const lane = laneFor(context.info.taskQueue);
    const signal = context.cancellationSignal;
    const { items } = input;
    const finished = new Set<number>();
    let next = 0;

    // Liveness from the first line to the last, whatever the step is doing
    const heartbeat = setInterval(
      () => context.heartbeat({ next }),
      deps.heartbeatEveryMs ?? HEARTBEAT_EVERY_MS,
    );
    const defer = setInterval(() => {
      const pending = items.filter((_, i) => i >= next && !finished.has(i));
      deps.repository
        .deferRepair(pending, DEFER_SECONDS)
        .catch((error) =>
          deps.log?.("deferRepair failed", { error: String(error) }),
        );
    }, deps.deferEveryMs ?? DEFER_EVERY_MS);
    context.heartbeat({ next });

    try {
      let upcoming: Promise<Prepared> | undefined = prepare(
        deps,
        items[0] as Fence,
        input,
        signal,
      );
      for (let i = 0; i < items.length; i++) {
        next = i;
        const current = upcoming as Promise<Prepared>;
        // Prefetch: the next item's bytes are read while this one is embedded
        upcoming =
          i + 1 < items.length
            ? prepare(deps, items[i + 1] as Fence, input, signal)
            : undefined;
        // An unconsumed prefetch must not raise an unhandled rejection
        upcoming?.catch(() => {});
        const prepared = await current;
        await embedItem(deps, prepared, lane, input, signal);
        finished.add(i);
      }
      next = items.length;
      signal.throwIfAborted();
      return toResult(
        await deps.repository.batchOutcome(items, input.profileId),
      );
    } catch (error) {
      throw stopReason(context, error);
    } finally {
      clearInterval(heartbeat);
      clearInterval(defer);
    }
  };
}

function validate(input: EmbedAssetsInput, profileId: number) {
  if (
    !Array.isArray(input.items) ||
    input.items.length === 0 ||
    input.items.length > MAX_ITEMS
  ) {
    throw ApplicationFailure.nonRetryable(
      `embedAssets takes 1 to ${MAX_ITEMS} items`,
      "InvalidInput",
    );
  }
  if (
    typeof input.dispatchId !== "string" ||
    input.dispatchId.length < 1 ||
    input.dispatchId.length > 128
  ) {
    throw ApplicationFailure.nonRetryable(
      "dispatchId must be 1 to 128 characters",
      "InvalidInput",
    );
  }
  if (input.profileId !== profileId) {
    throw ApplicationFailure.nonRetryable(
      `Profile ${input.profileId} requested, this worker embeds for profile ${profileId}`,
      "ProfileMismatch",
    );
  }
}

export function laneFor(taskQueue: string): Lane {
  return taskQueue.endsWith("-bulk") ? "bulk" : "interactive";
}

/** Step 1 and 2: read the item, then its bytes (outside the permit) */
async function prepare(
  deps: EmbedAssetsDeps,
  fence: Fence,
  { profileId, dispatchId }: EmbedAssetsInput,
  signal: AbortSignal,
): Promise<Prepared> {
  signal.throwIfAborted();
  const read = await deps.repository.embeddingInput(
    fence,
    profileId,
    dispatchId,
  );
  if (!read.ok) return { kind: "done" };
  const item = read.value;
  if (item.embedded) return { kind: "done" };
  if (
    item.blobId === null ||
    item.storageKey === null ||
    item.storedAt === null
  ) {
    // Not published yet: the ingest workflow's job
    return { kind: "done" };
  }
  if (item.status === "failed") {
    if (!item.retryable) return { kind: "done" };
    // This dispatch already failed it (a restart): the next dispatch retries
    // it, after its backoff
    if (item.failedInDispatch) return { kind: "done" };
    // The bytes are stored: a retry moves it back to stored, then embeds
    const stored = await deps.repository.markStored(fence, item.blobId);
    if (!stored.ok) return { kind: "done" };
  } else if (item.status !== "stored" && item.status !== "embedded") {
    return { kind: "done" };
  }
  try {
    const bytes = await deps.fetches.run(
      () => deps.blobs.get(item.storageKey as string, signal),
      signal,
    );
    return { kind: "embed", fence, blobId: item.blobId, bytes };
  } catch (error) {
    if (signal.aborted) throw error;
    if (error instanceof BlobReadError) {
      return {
        kind: "failed",
        fence,
        blobId: item.blobId,
        code: error.kind,
        error,
      };
    }
    throw error;
  }
}

/** Steps 3 to 5: inference under the permit, then write or record the failure */
async function embedItem(
  deps: EmbedAssetsDeps,
  prepared: Prepared,
  lane: Lane,
  { profileId, dispatchId }: EmbedAssetsInput,
  signal: AbortSignal,
) {
  if (prepared.kind === "done") return;
  if (prepared.kind === "failed") {
    await recordFailure(
      deps,
      dispatchId,
      prepared.fence,
      prepared.blobId,
      prepared.code,
      prepared.error,
    );
    return;
  }
  const { fence, blobId, bytes } = prepared;
  let vector: Float32Array | undefined;
  const release = await deps.permit.acquire(lane, signal);
  try {
    [vector] = await deps.embedder.embedImages([{ bytes }]);
  } catch (error) {
    release();
    if (signal.aborted) throw error;
    const code: ErrorCode =
      error instanceof ImageDecodeError ? "decode_failed" : "inference_failed";
    await recordFailure(deps, dispatchId, fence, blobId, code, error);
    return;
  }
  release();
  signal.throwIfAborted();
  if (!vector) throw new Error("The embedder returned no vector");
  const written = await deps.repository.writeEmbedding(
    fence,
    blobId,
    profileId,
    Array.from(vector),
  );
  if (written.ok && written.value.duplicate) deps.onDuplicate?.();
}

async function recordFailure(
  deps: EmbedAssetsDeps,
  dispatchId: string,
  fence: Fence,
  blobId: number,
  code: ErrorCode,
  error: unknown,
) {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  await deps.repository.markFailed(
    fence,
    blobId,
    {
      code,
      message,
      retryable: RETRYABLE.has(code),
    },
    dispatchId,
  );
}

/**
 * Once the activity's signal aborted, for any reason, nothing more is
 * written and the reason is reported as is: an interrupted read or permit
 * wait is not an asset failure.
 */
function stopReason(context: Context, error: unknown): unknown {
  if (!context.cancellationSignal.aborted) return error;
  const details = context.cancellationDetails;
  if (details?.workerShutdown) {
    return ApplicationFailure.retryable(
      "The worker is shutting down",
      "WorkerShutdown",
    );
  }
  const reason: unknown = context.cancellationSignal.reason;
  if (reason instanceof CancelledFailure) return reason;
  return new CancelledFailure(
    describe(details),
    undefined,
    error instanceof Error ? error : undefined,
  );
}

function describe(details: Context["cancellationDetails"]): string {
  if (!details) return "Cancelled";
  const reasons = Object.entries(details)
    .filter(([, value]) => value === true)
    .map(([key]) => key);
  return `Cancelled (${reasons.join(", ") || "unknown"})`;
}

function toResult(
  outcomes: Awaited<ReturnType<EmbeddingRepository["batchOutcome"]>>,
): EmbedAssetsResult {
  const result: EmbedAssetsResult = { embedded: 0, failed: [], skipped: [] };
  for (const item of outcomes) {
    if (item.outcome === "embedded") result.embedded += 1;
    else if (item.outcome === "failed") {
      result.failed.push({
        assetId: item.fence.assetId,
        code: item.errorCode ?? "unknown",
        retryable: item.retryable,
      });
    } else
      result.skipped.push({ assetId: item.fence.assetId, reason: item.reason });
  }
  return result;
}
