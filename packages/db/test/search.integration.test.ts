/**
 * Visual search storage: fencing, locking, garbage collection and queries
 * (docs/ai/search/VISUAL_SEARCH.md). Interleavings use a second connection
 * that holds a lock while the repository call waits on it.
 *
 * Needs a running Postgres with pgvector (docker compose up db). Works on its
 * own `<database>_search_test` database.
 *
 *   POSTGRES_HOST=localhost pnpm --filter @projectx/db test:integration
 *
 * SEARCH_BENCH=1 adds the product search benchmark at 100k assets.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaPg } from "@prisma/adapter-pg";
import { load } from "dotenv-mono";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PrismaClient } from "../generated/prisma/client";
import type { PrismaService } from "../src/lib/prisma.service";
import {
  EMBEDDING_DIMS,
  type Fence,
  SearchRepositoryService,
} from "../src/lib/search/search-repository.service";

load();
const root = join(__dirname, "..");
const configuredUrl = process.env.DATABASE_URL;
if (!configuredUrl) throw new Error("DATABASE_URL is not set");
const testUrl = new URL(configuredUrl);
const configuredName = testUrl.pathname.slice(1);
testUrl.pathname = `/${configuredName}_search_test`;
const testName = testUrl.pathname.slice(1);
if (!testName.endsWith("_test") || testName === configuredName) {
  throw new Error(`Refusing to run on ${testName}`);
}

let pool: Pool;
let client: PrismaClient;
let repo: SearchRepositoryService;
let profileId: number;
let ownerId: number;

async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}

/** A second connection, for holding locks */
async function connect() {
  const other = new Client({ connectionString: testUrl.toString() });
  await other.connect();
  return other;
}

/** Resolves once another backend is waiting on a lock */
async function waitForLockWait(count = 1) {
  for (let i = 0; i < 200; i++) {
    const [row] = await sql<{ n: number }>(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname = $1 AND wait_event_type = 'Lock'`,
      [testName],
    );
    if (row.n >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("No backend started waiting on a lock");
}

/** Deterministic unit vector pointing mostly along `axis` */
function vector(axis: number, noise = 0, seed = 1): number[] {
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648 - 0.5;
  };
  const values = Array.from({ length: EMBEDDING_DIMS }, () => random() * noise);
  values[axis % EMBEDDING_DIMS] += 1;
  const norm = Math.hypot(...values);
  return values.map((value) => value / norm);
}

const sha = (text: string) => createHash("sha256").update(text).digest("hex");

let externalCounter = 0;
async function admit(extra: { source?: string; admissionKey?: string } = {}) {
  const admission = await repo.admitAsset({
    source: extra.source ?? "test",
    externalId: `asset-${++externalCounter}`,
    admissionKey: extra.admissionKey,
    originUrl: "https://example.com/image.webp",
    license: "CC0-1.0",
  });
  if (admission.kind !== "admitted") throw new Error("Expected an admission");
  return { assetId: admission.assetId, generation: admission.generation };
}

/** An asset taken through publish, stored and embedded */
async function embeddedAsset(
  embedding: number[],
  content = `bytes-${externalCounter + 1}`,
  colors: string[] = [],
) {
  const fence = await admit();
  const published = await repo.publishBlob(fence, {
    sha256: sha(content),
    ext: "webp",
    contentType: "image/webp",
    bytes: 100,
    colors,
  });
  if (!published.ok) throw new Error(published.reason);
  const { blobId } = published.value;
  expect((await repo.markStored(fence, blobId)).ok).toBe(true);
  expect(
    (await repo.writeEmbedding(fence, blobId, profileId, embedding)).ok,
  ).toBe(true);
  return { fence, blobId, storageKey: published.value.storageKey };
}

/** An asset with its bytes published and stored, not embedded yet */
async function storedAsset(content: string) {
  const fence = await admit();
  const published = await repo.publishBlob(fence, {
    sha256: sha(content),
    ext: "webp",
    contentType: "image/webp",
    bytes: 1,
  });
  if (!published.ok) throw new Error(published.reason);
  expect((await repo.markStored(fence, published.value.blobId)).ok).toBe(true);
  return { fence, blobId: published.value.blobId };
}

let productCounter = 0;
async function product(
  name: string,
  extra: { imageUrl?: string; category?: string; status?: string } = {},
) {
  const [row] = await sql<{ id: number }>(
    `INSERT INTO product (created_by, name, sku, image_url, estimated_price, download_urls, tags, status, category, updated_at)
     VALUES ($1, $2, $3, $4, 10, '{}', '{}', $5, $6, now()) RETURNING id`,
    [
      ownerId,
      name,
      `SKU-${++productCounter}`,
      extra.imageUrl ?? `https://example.com/p${productCounter}.webp`,
      extra.status ?? "Available",
      extra.category ?? "Tools",
    ],
  );
  return row.id;
}

const imageUrlOf = async (productId: number) =>
  (
    await sql<{ image_url: string }>(
      "SELECT image_url FROM product WHERE id = $1",
      [productId],
    )
  )[0].image_url;

beforeAll(async () => {
  const admin = new URL(configuredUrl);
  admin.pathname = "/postgres";
  admin.search = "";
  const adminClient = new Client({ connectionString: admin.toString() });
  await adminClient.connect();
  await adminClient.query(`DROP DATABASE IF EXISTS "${testName}" WITH (FORCE)`);
  await adminClient.query(`CREATE DATABASE "${testName}"`);
  await adminClient.end();

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: "pipe",
  });

  pool = new Pool({ connectionString: testUrl.toString(), max: 10 });
  client = new PrismaClient({
    adapter: new PrismaPg(
      new Pool({ connectionString: testUrl.toString(), max: 10 }),
    ),
  });
  repo = new SearchRepositoryService(client as unknown as PrismaService);

  const [owner] = await sql<{ id: number }>(
    `INSERT INTO "user" (email, status, updated_at) VALUES ('search@test.dev', 'Active', now()) RETURNING id`,
  );
  ownerId = owner.id;
  profileId = await repo.ensureProfile({
    model: "google/embeddinggemma-2",
    modelRevision: "test",
    dims: EMBEDDING_DIMS,
    dtype: "q4",
    runtime: "test",
    documentTemplate: "image",
    queryPrompt: "SearchQuery",
  });
}, 120_000);

afterAll(async () => {
  await client?.$disconnect();
  await pool?.end();
});

describe("schema", () => {
  it("creates the indexes Prisma can't express", async () => {
    const rows = await sql<{ indexname: string }>(
      "SELECT indexname FROM pg_indexes WHERE indexname = ANY($1) ORDER BY 1",
      [
        [
          "ix_asset_embedding_hnsw",
          "ix_product_search_text_trgm",
          "uq_blob_sha256_live",
          "uq_product_asset_thumbnail",
        ],
      ],
    );
    expect(rows).toHaveLength(4);
  });

  it("keeps product.search_text in sync with name and description", async () => {
    const id = await product("Cordless drill");
    await sql(
      "UPDATE product SET description = 'Two batteries' WHERE id = $1",
      [id],
    );
    await sql("UPDATE product SET search_text = 'tampered' WHERE id = $1", [
      id,
    ]);
    const [row] = await sql<{ search_text: string }>(
      "SELECT search_text FROM product WHERE id = $1",
      [id],
    );
    expect(row.search_text).toBe("Cordless drill Two batteries");
  });

  it("keeps q4 and fp32 vectors in separate profiles", async () => {
    const fp32 = await repo.ensureProfile({
      model: "google/embeddinggemma-2",
      modelRevision: "test",
      dims: EMBEDDING_DIMS,
      dtype: "fp32",
      runtime: "test",
      documentTemplate: "image",
      queryPrompt: "SearchQuery",
    });
    expect(fp32).not.toBe(profileId);
  });

  it("refuses to change a profile's settings in place", async () => {
    await expect(
      repo.ensureProfile({
        model: "google/embeddinggemma-2",
        modelRevision: "test",
        dims: EMBEDDING_DIMS,
        dtype: "q4",
        runtime: "test",
        documentTemplate: "image",
        queryPrompt: "Other",
      }),
    ).rejects.toThrow(/other settings/);
  });

  it("has a single profile per model revision", async () => {
    const again = await repo.ensureProfile({
      model: "google/embeddinggemma-2",
      modelRevision: "test",
      dims: EMBEDDING_DIMS,
      dtype: "q4",
      runtime: "test",
      documentTemplate: "image",
      queryPrompt: "SearchQuery",
    });
    expect(again).toBe(profileId);
  });
});

describe("admission", () => {
  it("reuses the generation when the same content is admitted again", async () => {
    const first = await repo.admitAsset({
      source: "test",
      externalId: "retry",
      admissionKey: "etag-1",
    });
    const retry = await repo.admitAsset({
      source: "test",
      externalId: "retry",
      admissionKey: "etag-1",
    });
    expect(retry).toEqual({ ...first, reused: true });
  });

  it("coalesces concurrent admissions of the same content", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        repo.admitAsset({
          source: "test",
          externalId: "concurrent",
          admissionKey: "etag-1",
        }),
      ),
    );
    const generations = new Set(
      results.map((r) => (r.kind === "admitted" ? r.generation : -1)),
    );
    expect(generations).toEqual(new Set([1]));
  });

  it("starts a new generation for new content and stops serving the old vector", async () => {
    const { fence } = await embeddedAsset(vector(1));
    const [{ external_id }] = await sql<{ external_id: string }>(
      "SELECT external_id FROM asset WHERE id = $1",
      [fence.assetId],
    );
    const next = await repo.admitAsset({
      source: "test",
      externalId: external_id,
      admissionKey: "new-content",
    });
    expect(next).toMatchObject({ kind: "admitted", generation: 2 });
    const embeddings = await sql(
      "SELECT 1 FROM asset_embedding WHERE asset_id = $1",
      [fence.assetId],
    );
    expect(embeddings).toHaveLength(0);
  });

  it("never admits a deleted asset again, until it is restored", async () => {
    const fence = await admit();
    expect((await repo.deleteAsset(fence)).ok).toBe(true);
    const [{ external_id }] = await sql<{ external_id: string }>(
      "SELECT external_id FROM asset WHERE id = $1",
      [fence.assetId],
    );
    expect(
      await repo.admitAsset({ source: "test", externalId: external_id }),
    ).toEqual({ kind: "suppressed", assetId: fence.assetId });

    const restored = await repo.restoreAsset(fence.assetId);
    expect(restored).toEqual({
      ok: true,
      value: { assetId: fence.assetId, generation: fence.generation + 2 },
    });
  });

  it("can't restore an upload: its bytes are gone", async () => {
    const admission = await repo.admitAsset({
      source: "upload",
      externalId: `upload-${++externalCounter}`,
      stagingKey: "staging/upload",
    });
    if (admission.kind !== "admitted") throw new Error("Expected an admission");
    const fence = {
      assetId: admission.assetId,
      generation: admission.generation,
    };
    expect((await repo.deleteAsset(fence)).ok).toBe(true);
    expect(await repo.restoreAsset(fence.assetId)).toEqual({
      ok: false,
      reason: "no_source",
    });
  });
});

describe("blobs", () => {
  it("stores the same bytes once for two sources", async () => {
    const a = await admit({ source: "source-a" });
    const b = await admit({ source: "source-b" });
    const input = {
      sha256: sha("shared"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 10,
    };
    const first = await repo.publishBlob(a, input);
    const second = await repo.publishBlob(b, input);
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.blobId).toBe(first.value.blobId);
    expect(first.value.storageKey).toBe(
      `assets/${input.sha256}-${first.value.blobId}.webp`,
    );
    const again = await repo.publishBlob(a, input);
    expect(again).toMatchObject({ ok: true, value: { changed: false } });
  });

  it("releases the old blob when the content changes", async () => {
    const fence = await admit();
    const base = { ext: "webp", contentType: "image/webp", bytes: 1 };
    const old = await repo.publishBlob(fence, { ...base, sha256: sha("v1") });
    const next = await repo.publishBlob(fence, { ...base, sha256: sha("v2") });
    if (!old.ok || !next.ok) throw new Error("publish failed");
    const [row] = await sql<{ unreferenced_since: Date | null }>(
      "SELECT unreferenced_since FROM blob WHERE id = $1",
      [old.value.blobId],
    );
    expect(row.unreferenced_since).not.toBeNull();
    const [asset] = await sql<{ content_revision: number }>(
      "SELECT content_revision FROM asset WHERE id = $1",
      [fence.assetId],
    );
    expect(asset.content_revision).toBe(1);
  });

  it("collects unreferenced blobs, and a later publish gets a new key", async () => {
    const fence = await embeddedAsset(vector(2), "gc-bytes");
    const [{ blob_id }] = await sql<{ blob_id: number }>(
      "SELECT blob_id FROM asset WHERE id = $1",
      [fence.fence.assetId],
    );
    expect((await repo.deleteAsset(fence.fence)).ok).toBe(true);
    await sql(
      "UPDATE blob SET unreferenced_since = now() - interval '25 hours' WHERE id = $1",
      [blob_id],
    );

    const claimed = await repo.claimBlobsForDeletion();
    expect(claimed).toContainEqual({
      blobId: blob_id,
      storageKey: fence.storageKey,
    });

    // The same bytes come back while the object delete is in flight
    const again = await admit();
    const published = await repo.publishBlob(again, {
      sha256: sha("gc-bytes"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    });
    if (!published.ok) throw new Error(published.reason);
    expect(published.value.blobId).not.toBe(blob_id);
    expect(published.value.storageKey).not.toBe(fence.storageKey);

    expect(await repo.finishBlobDeletion(blob_id)).toBe(true);
    expect(await repo.finishBlobDeletion(published.value.blobId)).toBe(false);
  });

  it("doesn't claim a blob that is referenced again", async () => {
    const a = await admit();
    const input = {
      sha256: sha("revived"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    };
    const first = await repo.publishBlob(a, input);
    if (!first.ok) throw new Error(first.reason);
    await repo.deleteAsset(a);
    const b = await admit();
    await repo.publishBlob(b, input);
    await sql(
      "UPDATE blob SET unreferenced_since = now() - interval '25 hours' WHERE id = $1",
      [first.value.blobId],
    );
    const claimed = await repo.claimBlobsForDeletion();
    expect(claimed.map((c) => c.blobId)).not.toContain(first.value.blobId);
  });

  it("retries a blob stuck in deleting", async () => {
    const fence = await admit();
    const published = await repo.publishBlob(fence, {
      sha256: sha("stuck"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    });
    if (!published.ok) throw new Error(published.reason);
    await repo.deleteAsset(fence);
    await sql(
      `UPDATE blob SET state = 'deleting', deleting_started_at = now() - interval '11 minutes'
       WHERE id = $1`,
      [published.value.blobId],
    );
    const claimed = await repo.claimBlobsForDeletion();
    expect(claimed.map((c) => c.blobId)).toContain(published.value.blobId);
  });
});

describe("fencing", () => {
  it("replacing the bytes starts a new generation and stops serving the old vector", async () => {
    const { fence, blobId } = await embeddedAsset(vector(12), "first-bytes");
    const replaced = await repo.publishBlob(fence, {
      sha256: sha("second-bytes"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    });
    if (!replaced.ok) throw new Error(replaced.reason);
    expect(replaced.value.generation).toBe(fence.generation + 1);
    const [row] = await sql<{ status: string }>(
      "SELECT status::text FROM asset WHERE id = $1",
      [fence.assetId],
    );
    expect(row.status).toBe("admitted");
    const { hits } = await repo.searchAssets(vector(12), {
      profileId,
      limit: 5,
    });
    expect(hits.map((h) => h.assetId)).not.toContain(fence.assetId);

    // Workers (and search sessions) holding the old generation are fenced out
    expect(await repo.markStored(fence, blobId)).toEqual({
      ok: false,
      reason: "stale",
    });
    expect(
      await repo.writeEmbedding(fence, blobId, profileId, vector(12)),
    ).toEqual({ ok: false, reason: "stale" });
    const next = { ...fence, generation: replaced.value.generation };
    // The new generation still can't store a vector of the old bytes
    expect(await repo.markStored(next, blobId)).toEqual({
      ok: false,
      reason: "content_changed",
    });
    expect((await repo.markStored(next, replaced.value.blobId)).ok).toBe(true);
    expect(
      (
        await repo.writeEmbedding(
          next,
          replaced.value.blobId,
          profileId,
          vector(13),
        )
      ).ok,
    ).toBe(true);
    const [embedding] = await sql<{
      input_revision: number;
      ingest_generation: number;
    }>(
      "SELECT input_revision, ingest_generation FROM asset_embedding WHERE asset_id = $1",
      [fence.assetId],
    );
    expect(embedding).toEqual({
      input_revision: 1,
      ingest_generation: next.generation,
    });
  });

  it("late completions and failures don't undo an embedded asset", async () => {
    const { fence, blobId } = await embeddedAsset(vector(15));
    // A repeated store completion (overlapping repair) is a no-op
    expect(await repo.markStored(fence, blobId)).toEqual({
      ok: true,
      value: null,
    });
    // A failure from an attempt that lost the race changes nothing
    expect(
      await repo.markFailed(fence, blobId, {
        code: "fetch_timeout",
        message: "timeout",
        retryable: true,
      }),
    ).toEqual({
      ok: false,
      reason: "stale",
    });
    // A failure from before publication changes nothing either
    expect(
      await repo.markFailed(fence, null, {
        code: "fetch_timeout",
        message: "download failed",
        retryable: true,
      }),
    ).toEqual({
      ok: false,
      reason: "stale",
    });
    const { hits } = await repo.searchAssets(vector(15), {
      profileId,
      limit: 5,
    });
    expect(hits.map((h) => h.assetId)).toContain(fence.assetId);
  });

  it("a retried replacement whose result was lost resumes the new generation", async () => {
    const { fence } = await embeddedAsset(vector(16), "before-crash");
    const input = {
      sha256: sha("after-crash"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    };
    const first = await repo.publishBlob(fence, input);
    if (!first.ok) throw new Error(first.reason);
    // The replacement schedules its own repair, in the same transaction
    const [row] = await sql<{ due: boolean }>(
      "SELECT next_attempt_at > now() AS due FROM asset WHERE id = $1",
      [fence.assetId],
    );
    expect(row.due).toBe(true);
    // The caller crashed before learning the new generation and retries
    expect(await repo.publishBlob(fence, input)).toEqual(first);
    // Other bytes, or an older generation, stay fenced out
    expect(
      await repo.publishBlob(fence, {
        ...input,
        sha256: sha("something-else"),
      }),
    ).toEqual({ ok: false, reason: "stale" });
    expect(
      await repo.publishBlob(
        { ...fence, generation: fence.generation - 1 },
        input,
      ),
    ).toEqual({ ok: false, reason: "stale" });
  });

  it("a delayed pre-publication failure can't cancel the repair of stored bytes", async () => {
    const { fence, blobId } = await storedAsset("stored-then-failed");
    const embedding = await repo.markFailed(fence, blobId, {
      code: "fetch_timeout",
      message: "embedding timeout",
      retryable: true,
    });
    if (!embedding.ok) throw new Error(embedding.reason);
    expect(embedding.value.nextAttemptAt).not.toBeNull();
    // A download attempt that started before publication reports late
    expect(
      await repo.markFailed(fence, null, {
        code: "decode_failed",
        message: "invalid download",
        retryable: false,
      }),
    ).toEqual({
      ok: false,
      reason: "stale",
    });
    const [row] = await sql<{ error: string; due: boolean; attempts: number }>(
      "SELECT error, next_attempt_at IS NOT NULL AS due, attempts FROM asset WHERE id = $1",
      [fence.assetId],
    );
    // markFailed records, it doesn't count (beginAttempt counts dispatches)
    expect(row).toEqual({ error: "embedding timeout", due: true, attempts: 0 });
    // The retry embeds the stored bytes as usual
    expect((await repo.markStored(fence, blobId)).ok).toBe(true);
    expect(
      (await repo.writeEmbedding(fence, blobId, profileId, vector(18))).ok,
    ).toBe(true);
  });

  it("storing after a terminal pre-publication failure reschedules repair", async () => {
    const fence = await admit();
    const published = await repo.publishBlob(fence, {
      sha256: sha("published-then-late-failure"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    });
    if (!published.ok) throw new Error(published.reason);
    // A download attempt that lost the race reports a terminal failure first
    const failed = await repo.markFailed(fence, null, {
      code: "decode_failed",
      message: "invalid download",
      retryable: false,
    });
    if (!failed.ok) throw new Error(failed.reason);
    expect(failed.value.nextAttemptAt).toBeNull();
    // The winning attempt stores the bytes, then crashes before embedding
    expect((await repo.markStored(fence, published.value.blobId)).ok).toBe(
      true,
    );
    const [row] = await sql<{ status: string; due: boolean }>(
      "SELECT status::text, next_attempt_at > now() AS due FROM asset WHERE id = $1",
      [fence.assetId],
    );
    expect(row).toEqual({ status: "stored", due: true });
  });

  describe("every successful publication keeps repair scheduled after a terminal failure", () => {
    const input = (content: string) => ({
      sha256: sha(content),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    });
    const due = async (assetId: number) =>
      (
        await sql<{ due: boolean | null }>(
          "SELECT next_attempt_at > now() AS due FROM asset WHERE id = $1",
          [assetId],
        )
      )[0].due;

    it("first publication", async () => {
      const fence = await admit();
      expect(
        (
          await repo.markFailed(fence, null, {
            code: "decode_failed",
            message: "invalid download",
            retryable: false,
          })
        ).ok,
      ).toBe(true);
      expect(await due(fence.assetId)).toBeNull();
      expect(
        (await repo.publishBlob(fence, input("first-after-terminal"))).ok,
      ).toBe(true);
      expect(await due(fence.assetId)).toBe(true);
    });

    it("same-content publication", async () => {
      const fence = await admit();
      const first = await repo.publishBlob(fence, input("same-after-terminal"));
      if (!first.ok) throw new Error(first.reason);
      expect(
        (
          await repo.markFailed(fence, first.value.blobId, {
            code: "decode_failed",
            message: "decode failed",
            retryable: false,
          })
        ).ok,
      ).toBe(true);
      expect(await due(fence.assetId)).toBeNull();
      expect(
        (await repo.publishBlob(fence, input("same-after-terminal"))).ok,
      ).toBe(true);
      expect(await due(fence.assetId)).toBe(true);
    });

    it("resumed replacement", async () => {
      const { fence } = await embeddedAsset(vector(19), "resume-before");
      const replaced = await repo.publishBlob(fence, input("resume-after"));
      if (!replaced.ok) throw new Error(replaced.reason);
      const next = { ...fence, generation: replaced.value.generation };
      expect(
        (
          await repo.markFailed(next, replaced.value.blobId, {
            code: "decode_failed",
            message: "decode failed",
            retryable: false,
          })
        ).ok,
      ).toBe(true);
      expect(await due(fence.assetId)).toBeNull();
      expect((await repo.publishBlob(fence, input("resume-after"))).ok).toBe(
        true,
      );
      expect(await due(fence.assetId)).toBe(true);
    });
  });

  it("records a pre-publication failure on a re-admitted asset", async () => {
    const { fence } = await embeddedAsset(vector(17));
    const [{ external_id }] = await sql<{ external_id: string }>(
      "SELECT external_id FROM asset WHERE id = $1",
      [fence.assetId],
    );
    const again = await repo.admitAsset({
      source: "test",
      externalId: external_id,
      admissionKey: "refetch",
    });
    if (again.kind !== "admitted") throw new Error("Expected an admission");
    const failed = await repo.markFailed(
      { assetId: again.assetId, generation: again.generation },
      null,
      { code: "fetch_timeout", message: "download failed", retryable: true },
    );
    expect(failed.ok).toBe(true);
  });

  it("records a failure on the content it was about, with backoff", async () => {
    const fence = await admit();
    await repo.beginAttempt([fence], "wf/run/1", 600);
    const failed = await repo.markFailed(fence, null, {
      code: "fetch_timeout",
      message: "download failed",
      retryable: true,
    });
    if (!failed.ok) throw new Error(failed.reason);
    expect(failed.value.attempts).toBe(1);
    expect(failed.value.nextAttemptAt).not.toBeNull();
  });

  describe("dispatch accounting and failure precedence", () => {
    const retryable = {
      code: "fetch_timeout",
      message: "timed out",
      retryable: true,
    } as const;
    const terminal = {
      code: "decode_failed",
      message: "not an image",
      retryable: false,
    } as const;
    const state = async (assetId: number) =>
      (
        await sql<{
          status: string;
          attempts: number;
          error_code: string | null;
          error: string | null;
          due: boolean;
          dispatches: number;
        }>(
          `SELECT status::text, attempts, error_code, error, next_attempt_at IS NOT NULL AS due,
             (SELECT count(*)::int FROM asset_dispatch d WHERE d.asset_id = a.id) AS dispatches
           FROM asset a WHERE id = $1`,
          [assetId],
        )
      )[0];
    let seq = 0;
    const dispatch = () => `wf-${++seq}/run/1`;
    const externalIdOf = async (assetId: number) =>
      (
        await sql<{ external_id: string }>(
          "SELECT external_id FROM asset WHERE id = $1",
          [assetId],
        )
      )[0].external_id;

    it("two failures of one dispatch count one attempt and keep the last error", async () => {
      const { fence, blobId } = await storedAsset("fail-fail");
      expect(
        (await repo.beginAttempt([fence], dispatch(), 600)).included,
      ).toEqual([fence]);
      await repo.markFailed(fence, blobId, retryable);
      await repo.markFailed(fence, blobId, { ...retryable, message: "again" });
      expect(await state(fence.assetId)).toMatchObject({
        status: "failed",
        attempts: 1,
        error: "again",
        due: true,
      });
    });

    it("success wins over a failure in either order", async () => {
      const first = await storedAsset("fail-then-success");
      await repo.markFailed(first.fence, first.blobId, terminal);
      expect(
        (
          await repo.writeEmbedding(
            first.fence,
            first.blobId,
            profileId,
            vector(30),
          )
        ).ok,
      ).toBe(true);
      expect(await state(first.fence.assetId)).toMatchObject({
        status: "embedded",
        error: null,
        error_code: null,
        due: false,
      });

      const second = await storedAsset("success-then-fail");
      expect(
        (
          await repo.writeEmbedding(
            second.fence,
            second.blobId,
            profileId,
            vector(31),
          )
        ).ok,
      ).toBe(true);
      expect(
        await repo.markFailed(second.fence, second.blobId, retryable),
      ).toEqual({
        ok: false,
        reason: "stale",
      });
      expect((await state(second.fence.assetId)).status).toBe("embedded");
    });

    it("a terminal failure after storage stays terminal", async () => {
      const content = "terminal-after-storage";
      const { fence, blobId } = await storedAsset(content);
      await repo.markFailed(fence, blobId, terminal);
      const before = await state(fence.assetId);
      expect(before).toMatchObject({
        status: "failed",
        error_code: "decode_failed",
        due: false,
      });

      expect(await repo.markFailed(fence, blobId, retryable)).toEqual({
        ok: false,
        reason: "terminal",
      });
      expect(await repo.markStored(fence, blobId)).toEqual({
        ok: false,
        reason: "terminal",
      });
      const republished = await repo.publishBlob(fence, {
        sha256: sha(content),
        ext: "webp",
        contentType: "image/webp",
        bytes: 1,
      });
      expect(republished.ok).toBe(true);
      expect(await repo.beginAttempt([fence], dispatch(), 600)).toEqual({
        included: [],
        excluded: [{ fence, reason: "terminal" }],
      });
      expect(await repo.deferRepair([fence], 600)).toBe(0);
      expect(await state(fence.assetId)).toEqual(before);
    });

    it("counts one attempt per dispatch, and the sixth dispatch terminalizes", async () => {
      const { fence, blobId } = await storedAsset("five-dispatches");
      for (let i = 1; i <= 5; i++) {
        expect(
          (await repo.beginAttempt([fence], dispatch(), 600)).included,
        ).toEqual([fence]);
        await repo.markFailed(fence, blobId, retryable);
        expect(await state(fence.assetId)).toMatchObject({
          attempts: i,
          status: "failed",
          due: true,
        });
      }
      expect(await repo.beginAttempt([fence], dispatch(), 600)).toEqual({
        included: [],
        excluded: [{ fence, reason: "attempts_exhausted" }],
      });
      expect(await state(fence.assetId)).toMatchObject({
        attempts: 5,
        status: "failed",
        error_code: "attempts_exhausted",
        due: false,
      });
    });

    it("five dispatches failing before storage keep a deadline; the sixth terminalizes", async () => {
      const fence = await admit();
      for (let i = 1; i <= 5; i++) {
        await repo.beginAttempt([fence], dispatch(), 600);
        expect((await repo.markFailed(fence, null, retryable)).ok).toBe(true);
      }
      expect(await state(fence.assetId)).toMatchObject({
        attempts: 5,
        status: "failed",
        due: true,
      });
      expect(
        (await repo.beginAttempt([fence], dispatch(), 600)).excluded,
      ).toEqual([{ fence, reason: "attempts_exhausted" }]);
    });

    it("a replayed dispatch is counted once, also with another one in between", async () => {
      const fence = await admit();
      const [a, b] = [dispatch(), dispatch()];
      await repo.beginAttempt([fence], a, 600);
      // A's acknowledgement was lost; a schedule-to-start retry reuses its id too
      expect((await repo.beginAttempt([fence], a, 600)).included).toEqual([
        fence,
      ]);
      await repo.beginAttempt([fence], b, 600);
      expect((await repo.beginAttempt([fence], a, 600)).included).toEqual([
        fence,
      ]);
      expect(await state(fence.assetId)).toMatchObject({
        attempts: 2,
        dispatches: 2,
      });
    });

    it("concurrent dispatches each count once", async () => {
      const fence = await admit();
      const [a, b] = [dispatch(), dispatch()];
      await Promise.all([
        repo.beginAttempt([fence], a, 600),
        repo.beginAttempt([fence], b, 600),
        repo.beginAttempt([fence], a, 600),
      ]);
      expect(await state(fence.assetId)).toMatchObject({
        attempts: 2,
        dispatches: 2,
      });
    });

    it("at the cap, the fifth dispatch stays admitted on replay until a new one terminalizes", async () => {
      const replay = await admit();
      for (let i = 1; i < 5; i++)
        await repo.beginAttempt([replay], dispatch(), 600);
      const fifth = dispatch();
      await repo.beginAttempt([replay], fifth, 600);
      expect(await repo.beginAttempt([replay], fifth, 600)).toEqual({
        included: [replay],
        excluded: [],
      });
      expect(await state(replay.assetId)).toMatchObject({
        attempts: 5,
        due: true,
      });

      // A (fifth), B (new), A again: B finds the budget spent, A is then out
      const newer = dispatch();
      expect((await repo.beginAttempt([replay], newer, 600)).excluded).toEqual([
        { fence: replay, reason: "attempts_exhausted" },
      ]);
      expect((await repo.beginAttempt([replay], fifth, 600)).excluded).toEqual([
        { fence: replay, reason: "terminal" },
      ]);
    });

    it("dispatches only live, pending items of the current generation", async () => {
      const pending = await admit();
      const { fence: embedded } = await embeddedAsset(vector(32));
      const stale = { ...pending, generation: pending.generation - 1 };
      const result = await repo.beginAttempt(
        [pending, embedded, stale, { assetId: -1, generation: 1 }],
        dispatch(),
        600,
      );
      expect(result.included).toEqual([pending]);
      expect(result.excluded.map((e) => e.reason)).toEqual([
        "embedded",
        "stale",
        "missing",
      ]);
    });

    it("deferRepair only moves a deadline later", async () => {
      const fence = await admit();
      await repo.deferRepair([fence], 3600);
      const deadline = async () =>
        (
          await sql<{ at: Date }>(
            "SELECT next_attempt_at AS at FROM asset WHERE id = $1",
            [fence.assetId],
          )
        )[0].at.getTime();
      const later = await deadline();
      await repo.deferRepair([fence], 60);
      expect(await deadline()).toBe(later);
      expect((await state(fence.assetId)).attempts).toBe(0);
    });

    it("exhaustAttempts terminalizes pending items and leaves embedded ones", async () => {
      const pending = await admit();
      const { fence: embedded } = await embeddedAsset(vector(33));
      const id = dispatch();
      await repo.beginAttempt([pending, embedded], id, 600);
      expect(
        await repo.exhaustAttempts([pending, embedded], id, "dispatch_failed"),
      ).toEqual([pending]);
      expect(await state(pending.assetId)).toMatchObject({
        status: "failed",
        error_code: "dispatch_failed",
        due: false,
      });
      expect((await state(embedded.assetId)).status).toBe("embedded");
    });

    it("only the latest dispatch of a generation can give up on an item", async () => {
      const fence = await admit();
      const a = dispatch();
      const b = dispatch();
      await repo.beginAttempt([fence], a, 600);
      await repo.beginAttempt([fence], b, 600);
      // A gives up while B (newer) still owns the item: nothing changes
      expect(await repo.exhaustAttempts([fence], a, "dispatch_failed")).toEqual(
        [],
      );
      expect(await state(fence.assetId)).toMatchObject({
        status: "admitted",
        due: true,
      });
      // A dispatch never counted for the generation owns nothing either
      expect(
        await repo.exhaustAttempts([fence], dispatch(), "dispatch_failed"),
      ).toEqual([]);
      expect(await repo.exhaustAttempts([fence], b, "dispatch_failed")).toEqual(
        [fence],
      );
      expect(await state(fence.assetId)).toMatchObject({
        status: "failed",
        error_code: "dispatch_failed",
        due: false,
      });
    });

    it("a dispatch from before a content replacement can't give up on the new generation", async () => {
      const { fence, blobId } = await storedAsset("replaced-under-a");
      const a = dispatch();
      await repo.beginAttempt([fence], a, 600);
      const replaced = await repo.publishBlob(fence, {
        sha256: sha("replaced-under-a-2"),
        ext: "webp",
        contentType: "image/webp",
        bytes: 1,
      });
      if (!replaced.ok) throw new Error(replaced.reason);
      expect(blobId).not.toBe(replaced.value.blobId);
      const next = { ...fence, generation: replaced.value.generation };
      expect(await repo.exhaustAttempts([next], a, "dispatch_failed")).toEqual(
        [],
      );
      // The workflow re-admits the new generation before its next stage
      expect((await repo.beginAttempt([next], a, 600)).included).toEqual([
        next,
      ]);
      expect((await state(fence.assetId)).attempts).toBe(1);
    });

    it("publication and storage keep a dispatch's longer deferral", async () => {
      const fence = await admit();
      await repo.beginAttempt([fence], dispatch(), 8 * 3600);
      const hoursLeft = async () =>
        (
          await sql<{ hours: number }>(
            "SELECT (extract(epoch FROM next_attempt_at - now()) / 3600)::float8 AS hours FROM asset WHERE id = $1",
            [fence.assetId],
          )
        )[0].hours;
      expect(await hoursLeft()).toBeGreaterThan(7.9);
      const published = await repo.publishBlob(fence, {
        sha256: sha("long-deferral"),
        ext: "webp",
        contentType: "image/webp",
        bytes: 1,
      });
      if (!published.ok) throw new Error(published.reason);
      expect(await hoursLeft()).toBeGreaterThan(7.9);
      expect((await repo.markStored(fence, published.value.blobId)).ok).toBe(
        true,
      );
      expect(await hoursLeft()).toBeGreaterThan(7.9);
    });

    it("tells a restart of the dispatch that recorded a failure, not other dispatches", async () => {
      const { fence, blobId } = await storedAsset("failed-in-dispatch");
      const a = dispatch();
      await repo.beginAttempt([fence], a, 600);
      await repo.markFailed(fence, blobId, retryable, a);
      const read = async (id: string) => {
        const input = await repo.embeddingInput(fence, profileId, id);
        if (!input.ok) throw new Error(input.reason);
        return input.value.failedInDispatch;
      };
      expect(await read(a)).toBe(true);
      expect(await read(dispatch())).toBe(false);
      // Back to stored by a later dispatch: no longer failed at all
      expect((await repo.markStored(fence, blobId)).ok).toBe(true);
      expect(await read(a)).toBe(false);
    });

    it("reports a write that found the generation already embedded", async () => {
      const { fence, blobId } = await storedAsset("duplicate-write");
      expect(
        await repo.writeEmbedding(fence, blobId, profileId, vector(34)),
      ).toEqual({ ok: true, value: { duplicate: false } });
      expect(
        await repo.writeEmbedding(fence, blobId, profileId, vector(34)),
      ).toEqual({ ok: true, value: { duplicate: true } });
    });

    it("a same-key admission reuses a failed generation; a terminal one stays terminal", async () => {
      const failed = await admit({ admissionKey: "same-failed" });
      await repo.beginAttempt([failed], dispatch(), 600);
      await repo.markFailed(failed, null, retryable);
      const again = await repo.admitAsset({
        source: "test",
        externalId: await externalIdOf(failed.assetId),
        admissionKey: "same-failed",
      });
      expect(again).toEqual({ kind: "admitted", ...failed, reused: true });
      expect(await state(failed.assetId)).toMatchObject({
        attempts: 1,
        status: "failed",
        due: true,
      });

      const exhausted = await admit({ admissionKey: "same-exhausted" });
      for (let i = 0; i < 6; i++)
        await repo.beginAttempt([exhausted], dispatch(), 600);
      expect(
        await repo.admitAsset({
          source: "test",
          externalId: await externalIdOf(exhausted.assetId),
          admissionKey: "same-exhausted",
        }),
      ).toEqual({
        kind: "terminal",
        ...exhausted,
        errorCode: "attempts_exhausted",
      });
    });

    it("a new generation starts with a fresh budget", async () => {
      const fence = await admit({ admissionKey: "budget-v1" });
      for (let i = 0; i < 6; i++)
        await repo.beginAttempt([fence], dispatch(), 600);
      const next = await repo.admitAsset({
        source: "test",
        externalId: await externalIdOf(fence.assetId),
        admissionKey: "budget-v2",
      });
      if (next.kind !== "admitted") throw new Error(next.kind);
      expect(next.generation).toBe(fence.generation + 1);
      expect(await state(fence.assetId)).toMatchObject({
        status: "admitted",
        attempts: 0,
        error_code: null,
        dispatches: 0,
        due: true,
      });
    });

    it("reads embedding inputs and batch outcomes from the database", async () => {
      const { fence: done, blobId } = await embeddedAsset(vector(34));
      const stored = await storedAsset("outcome-stored");
      const notReady = await admit();
      const broken = await storedAsset("outcome-broken");
      await repo.markFailed(broken.fence, broken.blobId, terminal);

      const input = await repo.embeddingInput(done, profileId);
      if (!input.ok) throw new Error(input.reason);
      expect(input.value).toMatchObject({
        blobId,
        status: "embedded",
        embedded: true,
        retryable: true,
      });
      expect(
        await repo.embeddingInput({ ...done, generation: 0 }, profileId),
      ).toEqual({
        ok: false,
        reason: "stale",
      });

      expect(
        await repo.batchOutcome(
          [done, stored.fence, notReady, broken.fence],
          profileId,
        ),
      ).toEqual([
        { fence: done, outcome: "embedded" },
        { fence: stored.fence, outcome: "skipped", reason: "pending" },
        { fence: notReady, outcome: "skipped", reason: "not_ready" },
        {
          fence: broken.fence,
          outcome: "failed",
          errorCode: "decode_failed",
          retryable: false,
        },
      ]);
    });
  });

  it("rejects work for an older generation", async () => {
    const fence = await admit({ admissionKey: "a" });
    const [{ external_id }] = await sql<{ external_id: string }>(
      "SELECT external_id FROM asset WHERE id = $1",
      [fence.assetId],
    );
    await repo.admitAsset({
      source: "test",
      externalId: external_id,
      admissionKey: "b",
    });
    expect(await repo.markStored(fence, 0)).toEqual({
      ok: false,
      reason: "stale",
    });
    expect(await repo.deleteAsset(fence)).toEqual({
      ok: false,
      reason: "stale",
    });
    const [row] = await sql<{ deleted_at: Date | null }>(
      "SELECT deleted_at FROM asset WHERE id = $1",
      [fence.assetId],
    );
    expect(row.deleted_at).toBeNull();
  });

  it("doesn't embed an asset before its bytes are stored", async () => {
    const fence = await admit();
    expect(await repo.writeEmbedding(fence, 0, profileId, vector(3))).toEqual({
      ok: false,
      reason: "not_ready",
    });
  });

  it("never serves an embedding from another generation", async () => {
    const { fence } = await embeddedAsset(vector(4));
    const before = await repo.searchAssets(vector(4), {
      profileId,
      limit: 5,
    });
    expect(before.hits.map((h) => h.assetId)).toContain(fence.assetId);
    await sql(
      "UPDATE asset_embedding SET ingest_generation = ingest_generation - 1 WHERE asset_id = $1",
      [fence.assetId],
    );
    const after = await repo.searchAssets(vector(4), { profileId, limit: 5 });
    expect(after.hits.map((h) => h.assetId)).not.toContain(fence.assetId);
  });
});

describe("interleavings", () => {
  /** Locks the asset row on another connection and runs `hold` there */
  async function holding(fence: Fence, hold: (other: Client) => Promise<void>) {
    const other = await connect();
    await other.query("BEGIN");
    await other.query("SELECT 1 FROM asset WHERE id = $1 FOR UPDATE", [
      fence.assetId,
    ]);
    await hold(other);
    return {
      commit: async () => {
        await other.query("COMMIT");
        await other.end();
      },
    };
  }

  it("admission wins over an embedding write that was waiting", async () => {
    const { fence, blobId } = await storedAsset("adm-vs-emb");
    const admission = await holding(fence, (other) =>
      other
        .query(
          "UPDATE asset SET ingest_generation = ingest_generation + 1, status = 'admitted' WHERE id = $1",
          [fence.assetId],
        )
        .then(() => undefined),
    );
    const write = repo.writeEmbedding(fence, blobId, profileId, vector(5));
    await waitForLockWait();
    await admission.commit();
    expect(await write).toEqual({ ok: false, reason: "stale" });
    expect(
      await sql("SELECT 1 FROM asset_embedding WHERE asset_id = $1", [
        fence.assetId,
      ]),
    ).toHaveLength(0);
  });

  it("deletion wins over an embedding write that was waiting", async () => {
    const { fence, blobId } = await storedAsset("del-vs-emb");
    const deletion = await holding(fence, (other) =>
      other
        .query(
          "UPDATE asset SET deleted_at = now(), ingest_generation = ingest_generation + 1, blob_id = NULL WHERE id = $1",
          [fence.assetId],
        )
        .then(() => undefined),
    );
    const write = repo.writeEmbedding(fence, blobId, profileId, vector(6));
    await waitForLockWait();
    await deletion.commit();
    expect(await write).toEqual({ ok: false, reason: "deleted" });
    expect(
      await sql("SELECT 1 FROM asset_embedding WHERE asset_id = $1", [
        fence.assetId,
      ]),
    ).toHaveLength(0);
  });

  it("a deletion waiting behind an embedding write removes the embedding", async () => {
    const { fence } = await storedAsset("emb-vs-del");
    const writer = await holding(fence, async (other) => {
      await other.query(
        `INSERT INTO asset_embedding (asset_id, profile_id, ingest_generation, embedding)
         VALUES ($1, $2, $3, $4::halfvec(768))`,
        [
          fence.assetId,
          profileId,
          fence.generation,
          `[${vector(7).join(",")}]`,
        ],
      );
    });
    const deletion = repo.deleteAsset(fence);
    await waitForLockWait();
    await writer.commit();
    expect((await deletion).ok).toBe(true);
    expect(
      await sql("SELECT 1 FROM asset_embedding WHERE asset_id = $1", [
        fence.assetId,
      ]),
    ).toHaveLength(0);
  });

  it("deletion wins over a thumbnail attachment that was waiting", async () => {
    const { fence } = await embeddedAsset(vector(8));
    const productId = await product("Deleted thumbnail");
    const deletion = await holding(fence, (other) =>
      other
        .query(
          "UPDATE asset SET deleted_at = now(), ingest_generation = ingest_generation + 1, blob_id = NULL WHERE id = $1",
          [fence.assetId],
        )
        .then(() => undefined),
    );
    const attach = repo.attachThumbnail(
      productId,
      fence,
      await imageUrlOf(productId),
    );
    await waitForLockWait();
    await deletion.commit();
    expect(await attach).toEqual({ ok: false, reason: "deleted" });
    expect(
      await sql("SELECT 1 FROM product_asset WHERE product_id = $1", [
        productId,
      ]),
    ).toHaveLength(0);
  });

  it("product deletion and asset deletion don't deadlock", async () => {
    const { fence } = await embeddedAsset(vector(9));
    const productId = await product("Removed product");
    expect(
      (
        await repo.attachThumbnail(
          productId,
          fence,
          await imageUrlOf(productId),
        )
      ).ok,
    ).toBe(true);
    const other = await connect();
    await other.query("BEGIN");
    await other.query("DELETE FROM product WHERE id = $1", [productId]);
    const deletion = repo.deleteAsset(fence);
    await waitForLockWait();
    await other.query("COMMIT");
    await other.end();
    expect((await deletion).ok).toBe(true);
  });

  it("a thumbnail attachment waiting on a deleted product writes nothing", async () => {
    const { fence } = await embeddedAsset(vector(10));
    const productId = await product("Vanishing product");
    const url = await imageUrlOf(productId);
    const other = await connect();
    await other.query("BEGIN");
    await other.query("DELETE FROM product WHERE id = $1", [productId]);
    const attach = repo.attachThumbnail(productId, fence, url);
    await waitForLockWait();
    await other.query("COMMIT");
    await other.end();
    expect(await attach).toEqual({ ok: false, reason: "missing" });
  });

  it("a delayed detach doesn't remove a thumbnail for the product's new image", async () => {
    const { fence } = await embeddedAsset(vector(14));
    const productId = await product("Image comes back");
    await sql("UPDATE product SET image_url = NULL WHERE id = $1", [productId]);
    // The detach for the removed image is queued; the product gets a new one
    await sql(
      "UPDATE product SET image_url = 'https://example.com/back.webp' WHERE id = $1",
      [productId],
    );
    expect(
      (
        await repo.attachThumbnail(
          productId,
          fence,
          "https://example.com/back.webp",
        )
      ).ok,
    ).toBe(true);
    expect(await repo.detachThumbnail(productId)).toEqual({
      ok: false,
      reason: "url_changed",
    });
    expect(
      await sql("SELECT 1 FROM product_asset WHERE product_id = $1", [
        productId,
      ]),
    ).toHaveLength(1);

    await sql("UPDATE product SET image_url = NULL WHERE id = $1", [productId]);
    expect((await repo.detachThumbnail(productId)).ok).toBe(true);
  });

  it("drops a thumbnail ingested from an image the product no longer shows", async () => {
    const { fence } = await embeddedAsset(vector(11));
    const productId = await product("Changed image");
    const oldUrl = await imageUrlOf(productId);
    await sql(
      "UPDATE product SET image_url = 'https://example.com/new.webp' WHERE id = $1",
      [productId],
    );
    expect(await repo.attachThumbnail(productId, fence, oldUrl)).toEqual({
      ok: false,
      reason: "url_changed",
    });
  });

  it("retries after a deadlock", async () => {
    const fence = await admit();
    const published = await repo.publishBlob(fence, {
      sha256: sha("deadlock"),
      ext: "webp",
      contentType: "image/webp",
      bytes: 1,
    });
    if (!published.ok) throw new Error(published.reason);
    const [{ deadlocks: before }] = await sql<{ deadlocks: string }>(
      "SELECT deadlocks FROM pg_stat_database WHERE datname = $1",
      [testName],
    );

    // The other session takes the locks in the wrong order and detects
    // deadlocks later, so the repository's transaction is the one aborted
    const other = await connect();
    await other.query("SET deadlock_timeout = '10s'");
    await other.query("BEGIN");
    await other.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      sha("deadlock"),
    ]);
    const deletion = repo.deleteAsset(fence);
    await waitForLockWait();
    await other.query("SELECT 1 FROM asset WHERE id = $1 FOR UPDATE", [
      fence.assetId,
    ]);
    await other.query("COMMIT");
    await other.end();

    expect((await deletion).ok).toBe(true);
    const [{ deadlocks: after }] = await sql<{ deadlocks: string }>(
      "SELECT deadlocks FROM pg_stat_database WHERE datname = $1",
      [testName],
    );
    expect(Number(after)).toBeGreaterThan(Number(before));
  });
});

describe("queries", () => {
  const corpus: { assetId: number; colors: string[] }[] = [];

  beforeAll(async () => {
    // 2,000 embedded assets around 40 directions, a quarter of them red
    await sql(
      `WITH blobs AS (
         INSERT INTO blob (sha256, storage_key, content_type, bytes, colors)
         SELECT encode(sha256(('fixture-' || g)::bytea), 'hex'),
                'assets/fixture-' || g || '.webp', 'image/webp', 1,
                CASE WHEN g % 4 = 0 THEN ARRAY['red'] ELSE ARRAY['blue'] END
         FROM generate_series(1, 2000) g
         RETURNING id, storage_key
       )
       INSERT INTO asset (source, external_id, blob_id, ingest_generation, status, license)
       SELECT 'fixture', storage_key, id, 1, 'embedded', 'CC0-1.0' FROM blobs`,
    );
    const assets = await sql<{ id: number; colors: string[] }>(
      `SELECT a.id, b.colors FROM asset a JOIN blob b ON b.id = a.blob_id
       WHERE a.source = 'fixture' ORDER BY a.id`,
    );
    expect(assets).toHaveLength(2000);
    for (const [index, asset] of assets.entries()) {
      corpus.push({ assetId: asset.id, colors: asset.colors });
      await sql(
        `INSERT INTO asset_embedding (asset_id, profile_id, ingest_generation, embedding)
         VALUES ($1, $2, 1, $3::halfvec(768))`,
        [
          asset.id,
          profileId,
          `[${vector(index % 40, 0.8, index + 1).join(",")}]`,
        ],
      );
    }
    await sql("ANALYZE asset_embedding");
  }, 120_000);

  /** Exact nearest neighbours, with the vector index turned off */
  async function exactNeighbours(query: number[], color: string | null) {
    const other = await connect();
    try {
      await other.query("SET enable_indexscan = off");
      const { rows } = await other.query<{ id: number }>(
        `SELECT a.id FROM asset_embedding e JOIN asset a ON a.id = e.asset_id JOIN blob b ON b.id = a.blob_id
         WHERE e.profile_id = $1 AND e.ingest_generation = a.ingest_generation
           AND a.status = 'embedded' AND a.deleted_at IS NULL
           AND ($3::text IS NULL OR $3 = ANY(b.colors))
         ORDER BY e.embedding <=> $2::halfvec(768), a.id LIMIT 10`,
        [profileId, `[${query.join(",")}]`, color],
      );
      return rows.map((row) => row.id);
    } finally {
      await other.end();
    }
  }

  it("uses the HNSW index for asset search", async () => {
    const other = await connect();
    try {
      await other.query("BEGIN");
      await other.query("SET LOCAL hnsw.iterative_scan = relaxed_order");
      const { rows } = await other.query<{ "QUERY PLAN": string }>(
        `EXPLAIN SELECT asset_id FROM asset_embedding
         ORDER BY embedding <=> $1::halfvec(768) LIMIT 10`,
        [`[${vector(0).join(",")}]`],
      );
      expect(rows.map((r) => r["QUERY PLAN"]).join("\n")).toContain(
        "ix_asset_embedding_hnsw",
      );
      await other.query("ROLLBACK");
    } finally {
      await other.end();
    }
  });

  it("the repository's asset search query can use the HNSW index", async () => {
    // On 2,000 rows the planner rightly prefers an exact scan; the benchmark
    // checks that it picks the index unforced at 100k
    const plan = await repo.explainAssetSearch(vector(5, 0.8, 99), {
      profileId,
      limit: 10,
      colors: ["red"],
      preferIndex: true,
    });
    expect(plan).toContain("Index Scan using ix_asset_embedding_hnsw");
    expect(plan).toMatch(/Order By: \(embedding <=>/);
  });

  it("keeps filtered recall@10 at 0.95 or more against exact search", async () => {
    let found = 0;
    let total = 0;
    for (let q = 0; q < 20; q++) {
      const query = vector(q * 2, 0.8, 10_000 + q);
      const color = q % 2 === 0 ? "red" : null;
      const options = {
        profileId,
        limit: 10,
        colors: color ? [color] : undefined,
        // The approximate path, not the exact plan the planner picks at 2,000 rows
        preferIndex: true,
      };
      if (q === 0) {
        expect(await repo.explainAssetSearch(query, options)).toContain(
          "Index Scan using ix_asset_embedding_hnsw",
        );
      }
      const { hits } = await repo.searchAssets(query, options);
      const exact = await exactNeighbours(query, color);
      const returned = new Set(hits.map((h) => h.assetId));
      found += exact.filter((id) => returned.has(id)).length;
      total += exact.length;
      for (const [i, hit] of hits.entries()) {
        if (i > 0)
          expect(hit.similarity).toBeLessThanOrEqual(hits[i - 1].similarity);
        if (color) {
          const entry = corpus.find((c) => c.assetId === hit.assetId);
          expect(entry?.colors).toContain(color);
        }
      }
    }
    expect(found / total).toBeGreaterThanOrEqual(0.95);
  });

  it("applies the minimum similarity", async () => {
    const { hits } = await repo.searchAssets(vector(3, 0.8, 77), {
      profileId,
      limit: 50,
      minSimilarity: 0.5,
    });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.similarity >= 0.5)).toBe(true);
  });

  it("ranks products by their thumbnail, exactly, with filters", async () => {
    const drill = await product("Cordless drill", { category: "Tools" });
    const kettle = await product("Steel kettle", {
      category: "Kitchen & Home",
    });
    const hidden = await product("Discontinued drill", {
      category: "Tools",
      status: "Discontinued",
    });
    const links: [number, number][] = [
      [drill, 100],
      [kettle, 200],
      [hidden, 100],
    ];
    for (const [productId, axis] of links) {
      const { fence } = await embeddedAsset(
        vector(axis),
        `product-${productId}`,
        productId === kettle ? ["red"] : ["blue"],
      );
      const attached = await repo.attachThumbnail(
        productId,
        fence,
        await imageUrlOf(productId),
      );
      expect(attached.ok).toBe(true);
    }

    const hits = await repo.searchProductsByVector(vector(100), {
      profileId,
    });
    expect(hits.map((h) => h.productId)).toEqual([drill, kettle]);
    expect(hits[0].similarity).toBeCloseTo(1, 2);
    expect(hits[0].storageKey).toMatch(/^assets\/[0-9a-f]{64}-\d+\.webp$/);

    const red = await repo.searchProductsByVector(vector(100), {
      profileId,
      colors: ["red"],
    });
    expect(red.map((h) => h.productId)).toEqual([kettle]);
    const kitchen = await repo.searchProductsByVector(vector(100), {
      profileId,
      categories: ["Kitchen & Home"],
      minSimilarity: 0.9,
    });
    expect(kitchen).toEqual([]);

    // The product now shows another image: its old thumbnail isn't scored
    await sql(
      "UPDATE product SET image_url = 'https://example.com/other.webp' WHERE id = $1",
      [drill],
    );
    const after = await repo.searchProductsByVector(vector(100), {
      profileId,
    });
    expect(after.map((h) => h.productId)).toEqual([kettle]);
  });

  it("finds products by text with trigram KNN", async () => {
    await product("Cordless impact driver");
    const hits = await repo.searchProductsByText("cordless driver", {
      limit: 3,
    });
    const [best] = await sql<{ name: string }>(
      "SELECT name FROM product WHERE id = $1",
      [hits[0].productId],
    );
    expect(best.name).toBe("Cordless impact driver");
    for (const [i, hit] of hits.entries()) {
      if (i > 0) expect(hit.trigram).toBeLessThanOrEqual(hits[i - 1].trigram);
    }
  });
});

describe.runIf(process.env.SEARCH_BENCH === "1")("benchmark", () => {
  it("product search stays fast at 100k assets", async () => {
    // Building the index once after the bulk insert is much faster than
    // maintaining it row by row (throwaway database)
    await sql("DROP INDEX IF EXISTS ix_asset_embedding_hnsw");
    await sql(
      `WITH blobs AS (
         INSERT INTO blob (sha256, storage_key, content_type, bytes)
         SELECT encode(sha256(('bench-' || g)::bytea), 'hex'), 'assets/bench-' || g || '.webp', 'image/webp', 1
         FROM generate_series(1, 100000) g
         RETURNING id, storage_key
       ), assets AS (
         INSERT INTO asset (source, external_id, blob_id, ingest_generation, status)
         SELECT 'bench', storage_key, id, 1, 'embedded' FROM blobs RETURNING id
       )
       INSERT INTO asset_embedding (asset_id, profile_id, ingest_generation, embedding)
       SELECT a.id, $1, 1, (SELECT array_agg(random() - 0.5) FROM generate_series(1, 768) WHERE a.id > 0)::halfvec(768)
       FROM assets a`,
      [profileId],
    );
    const built = performance.now();
    // Docker's default /dev/shm (64 MB) can't hold a parallel build's segment
    await sql("SET maintenance_work_mem = '512MB'");
    await sql("SET max_parallel_maintenance_workers = 0");
    await sql(
      "CREATE INDEX ix_asset_embedding_hnsw ON asset_embedding USING hnsw (embedding halfvec_cosine_ops)",
    );
    await sql("ANALYZE");
    const report: string[] = [
      `HNSW build: ${((performance.now() - built) / 1000).toFixed(0)} s`,
    ];

    const plan = await repo.explainAssetSearch(vector(1, 0.8, 7), {
      profileId,
      limit: 10,
    });
    expect(plan).toContain("ix_asset_embedding_hnsw");
    const assetTimings: number[] = [];
    for (let q = 0; q < 30; q++) {
      const start = performance.now();
      const { hits } = await repo.searchAssets(vector(q, 0.8, 900 + q), {
        profileId,
        limit: 10,
      });
      assetTimings.push(performance.now() - start);
      expect(hits).toHaveLength(10);
    }
    assetTimings.sort((x, y) => x - y);
    report.push(
      `asset search (HNSW): p50 ${assetTimings[15].toFixed(1)} ms, p95 ${assetTimings[28].toFixed(1)} ms`,
    );
    for (const linked of [120, 1000, 5000]) {
      await sql("DELETE FROM product WHERE name LIKE 'Bench %'");
      // Product n gets the n-th bench asset: one distinct asset per product
      await sql(
        `WITH p AS (
           INSERT INTO product (created_by, name, sku, image_url, estimated_price, download_urls, tags, status, updated_at)
           SELECT $1, 'Bench ' || g, 'BENCH-' || g, 'https://example.com/b' || g, 1, '{}', '{}', 'Available', now()
           FROM generate_series(1, $2::int) g RETURNING id, image_url, substring(sku FROM 7)::int AS n
         ), a AS (
           SELECT id, row_number() OVER (ORDER BY id) AS n FROM asset WHERE source = 'bench'
         )
         INSERT INTO product_asset (product_id, asset_id, role, source_image_url)
         SELECT p.id, a.id, 'thumbnail', p.image_url FROM p JOIN a ON a.n = p.n`,
        [ownerId, linked],
      );
      const [{ distinct }] = await sql<{ distinct: number }>(
        `SELECT count(DISTINCT pa.asset_id)::int AS distinct FROM product_asset pa
         JOIN product p ON p.id = pa.product_id WHERE p.name LIKE 'Bench %'`,
      );
      expect(distinct).toBe(linked);
      const timings: number[] = [];
      for (let q = 0; q < 30; q++) {
        const start = performance.now();
        const hits = await repo.searchProductsByVector(
          vector(q, 0.8, 500 + q),
          {
            profileId,
            limit: 10,
          },
        );
        timings.push(performance.now() - start);
        expect(hits).toHaveLength(10);
      }
      timings.sort((x, y) => x - y);
      report.push(
        `${linked} linked: p50 ${timings[15].toFixed(1)} ms, p95 ${timings[28].toFixed(1)} ms`,
      );
    }
    const text = `Search at 100k assets\n  ${report.join("\n  ")}\n`;
    // Vitest hides console output of passing tests; the report goes to a file too
    if (process.env.SEARCH_BENCH_REPORT) {
      writeFileSync(process.env.SEARCH_BENCH_REPORT, text);
    }
    console.log(text);
  }, 1_800_000);
});
