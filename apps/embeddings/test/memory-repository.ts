import type {
  EmbeddingInput,
  ErrorCode,
  FailureInput,
  Fence,
  Fenced,
  ItemOutcome,
} from "@projectx/db";

import type { EmbeddingRepository } from "../src/image/embed-assets";

export type MemoryAsset = {
  generation: number;
  deleted?: boolean;
  storageKey: string | null;
  status: "admitted" | "stored" | "embedded" | "failed";
  stored: boolean;
  deadline: boolean;
  errorCode?: ErrorCode;
  embeddedFor?: number;
  /** Dispatches that recorded a failure for this generation */
  failedBy?: Set<string>;
};

/** The embedding path's repository rules, in memory (the real ones are in 3.4) */
export class MemoryRepository implements EmbeddingRepository {
  readonly assets = new Map<number, MemoryAsset>();
  readonly failures: { fence: Fence; failure: FailureInput }[] = [];
  readonly deferred: Fence[][] = [];
  writes = 0;
  /** Called before each embeddingInput, e.g. to fail like a lost database */
  onRead?: (fence: Fence) => void | Promise<void>;

  stored(assetId: number, overrides: Partial<MemoryAsset> = {}): Fence {
    const asset: MemoryAsset = {
      generation: 1,
      storageKey: `assets/${assetId}`,
      status: "stored",
      stored: true,
      deadline: true,
      ...overrides,
    };
    this.assets.set(assetId, asset);
    return { assetId, generation: asset.generation };
  }

  private fenced(
    fence: Fence,
  ): { asset: MemoryAsset } | { reason: "missing" | "deleted" | "stale" } {
    const asset = this.assets.get(fence.assetId);
    if (!asset) return { reason: "missing" };
    if (asset.deleted) return { reason: "deleted" };
    if (asset.generation !== fence.generation) return { reason: "stale" };
    return { asset };
  }

  async embeddingInput(
    fence: Fence,
    profileId: number,
    dispatchId?: string,
  ): Promise<Fenced<EmbeddingInput>> {
    await this.onRead?.(fence);
    const f = this.fenced(fence);
    if ("reason" in f) return { ok: false, reason: f.reason };
    const { asset } = f;
    return {
      ok: true,
      value: {
        storageKey: asset.storageKey,
        status: asset.status,
        storedAt: asset.stored ? new Date() : null,
        retryable: !(asset.status === "failed" && !asset.deadline),
        embedded: asset.embeddedFor === profileId,
        failedInDispatch:
          asset.status === "failed" &&
          dispatchId !== undefined &&
          (asset.failedBy?.has(dispatchId) ?? false),
      },
    };
  }

  async markStored(fence: Fence, storageKey: string): Promise<Fenced<null>> {
    const f = this.fenced(fence);
    if ("reason" in f) return { ok: false, reason: f.reason };
    if (f.asset.storageKey !== storageKey)
      return { ok: false, reason: "content_changed" };
    if (f.asset.status === "failed" && !f.asset.deadline)
      return { ok: false, reason: "terminal" };
    if (f.asset.status === "failed")
      Object.assign(f.asset, { status: "stored", errorCode: undefined });
    return { ok: true, value: null };
  }

  async writeEmbedding(
    fence: Fence,
    storageKey: string,
    profileId: number,
  ): Promise<Fenced<{ duplicate: boolean }>> {
    const f = this.fenced(fence);
    if ("reason" in f) return { ok: false, reason: f.reason };
    if (f.asset.storageKey !== storageKey)
      return { ok: false, reason: "content_changed" };
    this.writes += 1;
    const duplicate = f.asset.embeddedFor === profileId;
    Object.assign(f.asset, {
      status: "embedded",
      embeddedFor: profileId,
      deadline: false,
      errorCode: undefined,
    });
    return { ok: true, value: { duplicate } };
  }

  async markFailed(
    fence: Fence,
    _storageKey: string | null,
    failure: FailureInput,
    dispatchId?: string,
  ): Promise<Fenced<{ attempts: number; nextAttemptAt: Date | null }>> {
    this.failures.push({ fence, failure });
    const f = this.fenced(fence);
    if ("reason" in f) return { ok: false, reason: f.reason };
    if (f.asset.status === "embedded") return { ok: false, reason: "stale" };
    Object.assign(f.asset, {
      status: "failed",
      errorCode: failure.code,
      deadline: failure.retryable,
    });
    if (dispatchId) {
      f.asset.failedBy ??= new Set();
      f.asset.failedBy.add(dispatchId);
    }
    return { ok: true, value: { attempts: 1, nextAttemptAt: null } };
  }

  async deferRepair(fences: readonly Fence[]): Promise<number> {
    this.deferred.push([...fences]);
    return fences.length;
  }

  async batchOutcome(
    fences: readonly Fence[],
    profileId: number,
  ): Promise<ItemOutcome[]> {
    return fences.map((fence): ItemOutcome => {
      const f = this.fenced(fence);
      if ("reason" in f) return { fence, outcome: "skipped", reason: f.reason };
      const { asset } = f;
      if (asset.embeddedFor === profileId)
        return { fence, outcome: "embedded" };
      if (asset.status === "failed") {
        return {
          fence,
          outcome: "failed",
          errorCode: asset.errorCode ?? null,
          retryable: asset.deadline,
        };
      }
      if (!asset.stored)
        return { fence, outcome: "skipped", reason: "not_ready" };
      return { fence, outcome: "skipped", reason: "pending" };
    });
  }
}
