import {
  BlobReadError,
  FakeEmbedder,
  ImageDecodeError,
  MemoryBlobReader,
  PriorityPermit,
} from "@projectx/embeddings";
import {
  ActivityCancellationDetails,
  ApplicationFailure,
  CancelledFailure,
} from "@temporalio/common";
import { MockActivityEnvironment } from "@temporalio/testing";
import { describe, expect, it } from "vitest";

import { Limiter } from "../src/common/limiter";
import {
  createEmbedAssets,
  type EmbedAssetsDeps,
  laneFor,
  MAX_ITEMS,
} from "../src/image/embed-assets";
import { MemoryRepository } from "./memory-repository";

const PROFILE = 7;
const DISPATCH = "ingest-1/run-1/1";
const png = (n: number) => new Uint8Array([0x89, 0x50, 0x4e, 0x47, n]);

function setup(
  overrides: Partial<EmbedAssetsDeps> = {},
  blobs = new MemoryBlobReader(),
) {
  const repository = new MemoryRepository();
  let inferences = 0;
  const embedder = new FakeEmbedder({
    onImage: (item) => {
      inferences += 1;
      if (item.bytes[4] === 0xff) throw new ImageDecodeError("not an image");
    },
  });
  let duplicates = 0;
  const deps: EmbedAssetsDeps = {
    repository,
    embedder,
    permit: new PriorityPermit(),
    blobs,
    fetches: new Limiter(2),
    profileId: PROFILE,
    onDuplicate: () => {
      duplicates += 1;
    },
    ...overrides,
  };
  const add = (
    assetId: number,
    overrides: Parameters<MemoryRepository["stored"]>[1] = {},
  ) => {
    const fence = repository.stored(assetId, overrides);
    const key = repository.assets.get(assetId)?.storageKey;
    if (key) blobs.put(key, png(assetId));
    return fence;
  };
  return {
    repository,
    blobs,
    deps,
    add,
    embedAssets: createEmbedAssets(deps),
    inferences: () => inferences,
    duplicates: () => duplicates,
  };
}

const env = (taskQueue = "embeddings-interactive") =>
  new MockActivityEnvironment({ taskQueue });

describe("embedAssets", () => {
  it("embeds stored items and reports every fence from the database", async () => {
    const t = setup();
    const a = t.add(1);
    const b = t.add(2);
    const stale = { ...t.add(3), generation: 0 };
    const deleted = t.add(4, { deleted: true });
    const notReady = t.add(5, {
      status: "admitted",
      stored: false,
      blobId: null,
      storageKey: null,
    });
    const result = await env().run(t.embedAssets, {
      items: [a, b, stale, deleted, notReady],
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result).toEqual({
      embedded: 2,
      failed: [],
      skipped: [
        { assetId: 3, reason: "stale" },
        { assetId: 4, reason: "deleted" },
        { assetId: 5, reason: "not_ready" },
      ],
    });
    expect(t.inferences()).toBe(2);
  });

  it("fails before any read when the profile is not the worker's", async () => {
    const t = setup();
    const a = t.add(1);
    const error = await env()
      .run(t.embedAssets, {
        items: [a],
        profileId: PROFILE + 1,
        dispatchId: DISPATCH,
      })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApplicationFailure);
    expect((error as ApplicationFailure).type).toBe("ProfileMismatch");
    expect((error as ApplicationFailure).nonRetryable).toBe(true);
    expect(t.blobs.reads).toBe(0);
    expect(t.repository.writes).toBe(0);
  });

  it("refuses an empty batch and one above the limit", async () => {
    const t = setup();
    for (const items of [
      [],
      Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({
        assetId: i,
        generation: 1,
      })),
    ]) {
      const error = await env()
        .run(t.embedAssets, { items, profileId: PROFILE, dispatchId: DISPATCH })
        .catch((e: unknown) => e);
      expect((error as ApplicationFailure).type).toBe("InvalidInput");
    }
  });

  it("does no inference for an item already embedded for the profile", async () => {
    const t = setup();
    const a = t.add(1, {
      status: "embedded",
      embeddedFor: PROFILE,
      deadline: false,
    });
    const result = await env().run(t.embedAssets, {
      items: [a],
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result.embedded).toBe(1);
    expect(t.inferences()).toBe(0);
    expect(t.blobs.reads).toBe(0);
  });

  it("records a decode failure as terminal and a storage timeout as retryable", async () => {
    const blobs = new MemoryBlobReader({
      onRead: (key) => {
        if (key === "assets/2")
          throw new BlobReadError("fetch_timeout", "slow store");
      },
    });
    const t = setup({}, blobs);
    const broken = t.add(1);
    blobs.put("assets/1", new Uint8Array([0, 0, 0, 0, 0xff]));
    const slow = t.add(2);
    const result = await env().run(t.embedAssets, {
      items: [broken, slow],
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result.failed).toEqual([
      { assetId: 1, code: "decode_failed", retryable: false },
      { assetId: 2, code: "fetch_timeout", retryable: true },
    ]);
  });

  it("moves a retryable failure with stored bytes back to stored and embeds it", async () => {
    const t = setup();
    const a = t.add(1, {
      status: "failed",
      errorCode: "fetch_timeout",
      deadline: true,
    });
    const terminal = t.add(2, {
      status: "failed",
      errorCode: "decode_failed",
      deadline: false,
    });
    const result = await env().run(t.embedAssets, {
      items: [a, terminal],
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result.embedded).toBe(1);
    expect(result.failed).toEqual([
      { assetId: 2, code: "decode_failed", retryable: false },
    ]);
    // The terminal item is not embedded again
    expect(t.inferences()).toBe(1);
  });

  it("counts a write that found the generation already embedded", async () => {
    const t = setup();
    const a = t.add(1);
    // Another attempt embeds the item between this attempt's read and write
    const original = t.repository.writeEmbedding.bind(t.repository);
    t.repository.writeEmbedding = async (fence, blobId, profileId, vector) => {
      await original(fence, blobId, profileId, vector);
      return original(fence, blobId, profileId, vector);
    };
    await env().run(t.embedAssets, {
      items: [a],
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(t.duplicates()).toBe(1);
  });

  it("heartbeats while a read is slower than the heartbeat interval", async () => {
    const blobs = new MemoryBlobReader({ delayMs: 120 });
    const t = setup({ heartbeatEveryMs: 20 }, blobs);
    const a = t.add(1);
    const mock = env();
    const beats: unknown[] = [];
    mock.on("heartbeat", (details: unknown) => beats.push(details));
    const result = await mock.run(t.embedAssets, {
      items: [a],
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result.embedded).toBe(1);
    expect(beats.length).toBeGreaterThanOrEqual(4);
    expect(beats[0]).toEqual({ next: 0 });
  });

  it("pushes the repair deadline of pending items on its own cadence", async () => {
    const blobs = new MemoryBlobReader({ delayMs: 60 });
    const t = setup({ deferEveryMs: 25 }, blobs);
    const items = [t.add(1), t.add(2), t.add(3)];
    await env().run(t.embedAssets, {
      items,
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(t.repository.deferred.length).toBeGreaterThan(0);
    // Never the items already finished
    const last = t.repository.deferred.at(-1) ?? [];
    expect(last.length).toBeLessThan(3);
  });

  it("stops on cancellation without recording a failure for the item in flight", async () => {
    const blobs = new MemoryBlobReader({ delayMs: 5_000 });
    const t = setup({}, blobs);
    const a = t.add(1);
    const mock = env();
    const run = mock
      .run(t.embedAssets, {
        items: [a],
        profileId: PROFILE,
        dispatchId: DISPATCH,
      })
      .catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 30));
    mock.cancel(
      "TIMED_OUT",
      new ActivityCancellationDetails({ timedOut: true }),
    );
    expect(await run).toBeInstanceOf(CancelledFailure);
    expect(t.repository.failures).toEqual([]);
    expect(t.repository.writes).toBe(0);
  });

  it("reports WorkerShutdown when the worker shuts down mid-batch", async () => {
    const blobs = new MemoryBlobReader({ delayMs: 5_000 });
    const t = setup({}, blobs);
    const a = t.add(1);
    const mock = env();
    const run = mock
      .run(t.embedAssets, {
        items: [a],
        profileId: PROFILE,
        dispatchId: DISPATCH,
      })
      .catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 30));
    mock.cancel(
      "WORKER_SHUTDOWN",
      new ActivityCancellationDetails({ workerShutdown: true }),
    );
    const error = await run;
    expect(error).toBeInstanceOf(ApplicationFailure);
    expect((error as ApplicationFailure).type).toBe("WorkerShutdown");
    expect(t.repository.failures).toEqual([]);
  });

  it("fails on an infrastructure error and a rescheduled attempt gives the full result", async () => {
    const t = setup();
    const items = Array.from({ length: 6 }, (_, i) => t.add(i + 1));
    let down = true;
    t.repository.onRead = (fence) => {
      if (down && fence.assetId === 4) throw new Error("database unreachable");
    };
    const error = await env()
      .run(t.embedAssets, { items, profileId: PROFILE, dispatchId: DISPATCH })
      .catch((e: unknown) => e);
    expect(String(error)).toContain("database unreachable");
    down = false;
    const inferencesBefore = t.inferences();
    const result = await env().run(t.embedAssets, {
      items,
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result).toEqual({ embedded: 6, failed: [], skipped: [] });
    // Items finished by the first attempt are skipped, not embedded again
    expect(t.inferences() - inferencesBefore).toBeLessThanOrEqual(3);
  });

  it("doesn't retry, in a restart of the same dispatch, an item that dispatch already failed", async () => {
    let storeDown = true;
    const blobs = new MemoryBlobReader({
      onRead: (key) => {
        if (storeDown && key === "assets/1")
          throw new BlobReadError("storage_unavailable", "down");
      },
    });
    const t = setup({}, blobs);
    const items = [t.add(1), t.add(2)];
    let dbDown = true;
    t.repository.onRead = (fence) => {
      if (dbDown && fence.assetId === 2)
        throw new Error("database unreachable");
    };
    // X fails (retryable), then an infrastructure error stops the run at Y
    const first = await env()
      .run(t.embedAssets, { items, profileId: PROFILE, dispatchId: DISPATCH })
      .catch((e: unknown) => e);
    expect(String(first)).toContain("database unreachable");
    storeDown = false;
    dbDown = false;
    // Same dispatch: X keeps its failure (and its backoff), Y is embedded
    const restart = await env().run(t.embedAssets, {
      items,
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(restart.failed).toEqual([
      { assetId: 1, code: "storage_unavailable", retryable: true },
    ]);
    expect(restart.embedded).toBe(1);
    // A new dispatch (repair) retries it
    const repair = await env().run(t.embedAssets, {
      items,
      profileId: PROFILE,
      dispatchId: "repair/run-1/1",
    });
    expect(repair).toEqual({ embedded: 2, failed: [], skipped: [] });
  });

  it("keeps the worst-case result of 500 failed items small", async () => {
    const t = setup();
    const items = Array.from({ length: MAX_ITEMS }, (_, i) =>
      t.add(100_000 + i, {
        status: "failed",
        errorCode: "attempts_exhausted",
        deadline: false,
      }),
    );
    const result = await env().run(t.embedAssets, {
      items,
      profileId: PROFILE,
      dispatchId: DISPATCH,
    });
    expect(result.failed).toHaveLength(MAX_ITEMS);
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(64 * 1024);
  });

  it("picks the permit lane from the task queue", () => {
    expect(laneFor("embeddings-bulk")).toBe("bulk");
    expect(laneFor("embeddings-interactive")).toBe("interactive");
  });
});
