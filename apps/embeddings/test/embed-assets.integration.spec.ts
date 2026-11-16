/**
 * Contract tests (step 3.4): `embedAssets` against the real
 * SearchRepositoryService and PostgreSQL, with FakeEmbedder and in-memory
 * bytes. Works on its own `<database>_embed_test` database.
 *
 *   POSTGRES_HOST=localhost pnpm --filter @projectx/embeddings-app test:integration
 *
 * With S3_TEST_ENDPOINT (e.g. http://localhost:9000) and the S3_* credentials
 * it also does one round trip against RustFS.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { dirname } from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  type Fence,
  PrismaService,
  SearchRepositoryService,
} from "@projectx/db";
import {
  BlobReadError,
  FakeEmbedder,
  ImageDecodeError,
  MemoryBlobReader,
  PriorityPermit,
  S3BlobReader,
} from "@projectx/embeddings";
import { ApplicationFailure } from "@temporalio/common";
import { MockActivityEnvironment } from "@temporalio/testing";
import { load } from "dotenv-mono";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Limiter } from "../src/common/limiter";
import {
  createEmbedAssets,
  type EmbedAssetsDeps,
} from "../src/image/embed-assets";

load();
const configuredUrl = process.env.DATABASE_URL;
if (!configuredUrl) throw new Error("DATABASE_URL is not set");
const testUrl = new URL(configuredUrl);
const configuredName = testUrl.pathname.slice(1);
testUrl.pathname = `/${configuredName}_embed_test`;
const testName = testUrl.pathname.slice(1);
if (!testName.endsWith("_test") || testName === configuredName) {
  throw new Error(`Refusing to run on ${testName}`);
}
const dbPackage = dirname(require.resolve("@projectx/db/package.json"));

let prisma: PrismaService;
let repo: SearchRepositoryService;
let profileId: number;
const embedder = new FakeEmbedder({
  onImage: (item) => {
    if (item.bytes[0] === 0xff) throw new ImageDecodeError("not an image");
  },
});
let counter = 0;
let dispatches = 0;
const dispatch = () => `contract-${++dispatches}/run/1`;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const sql = async <T>(text: string, values: unknown[] = []) =>
  (await prisma.$queryRawUnsafe(text, ...values)) as T[];

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
    cwd: dbPackage,
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: "pipe",
  });
  process.env.DATABASE_URL = testUrl.toString();
  prisma = new PrismaService();
  repo = new SearchRepositoryService(prisma);
  profileId = await repo.ensureProfile(embedder.profile());
}, 120_000);

afterAll(async () => {
  await prisma?.$disconnect();
});

/** An asset admitted, published and stored, its bytes in `blobs` */
async function stored(
  blobs: MemoryBlobReader,
  bytes = new Uint8Array([1, 2, ++counter]),
) {
  const admission = await repo.admitAsset({
    source: "contract",
    externalId: `asset-${++counter}`,
  });
  if (admission.kind !== "admitted") throw new Error(admission.kind);
  const fence = {
    assetId: admission.assetId,
    generation: admission.generation,
  };
  const published = await repo.publishBlob(fence, {
    sha256: sha(`${counter}-${randomUUID()}`),
    ext: "webp",
    contentType: "image/webp",
    bytes: bytes.length,
  });
  if (!published.ok) throw new Error(published.reason);
  expect((await repo.markStored(fence, published.value.blobId)).ok).toBe(true);
  blobs.put(published.value.storageKey, bytes);
  return {
    fence,
    blobId: published.value.blobId,
    storageKey: published.value.storageKey,
  };
}

function activity(
  blobs: MemoryBlobReader,
  overrides: Partial<EmbedAssetsDeps> = {},
) {
  let duplicates = 0;
  const run = createEmbedAssets({
    repository: repo,
    embedder,
    permit: new PriorityPermit(),
    blobs,
    fetches: new Limiter(2),
    profileId,
    onDuplicate: () => {
      duplicates += 1;
    },
    ...overrides,
  });
  return {
    run: (items: Fence[], dispatchId = dispatch(), profile = profileId) =>
      new MockActivityEnvironment({ taskQueue: "embeddings-bulk" }).run(run, {
        items,
        profileId: profile,
        dispatchId,
      }),
    duplicates: () => duplicates,
  };
}

const state = async (assetId: number) =>
  (
    await sql<{
      status: string;
      error_code: string | null;
      due: boolean;
      embeddings: number;
    }>(
      `SELECT status::text AS status, error_code, next_attempt_at IS NOT NULL AS due,
         (SELECT count(*)::int FROM asset_embedding e WHERE e.asset_id = a.id) AS embeddings
       FROM asset a WHERE id = $1`,
      [assetId],
    )
  )[0];

describe("embedAssets against the repository", () => {
  it("embeds and clears the repair deadline", async () => {
    const blobs = new MemoryBlobReader();
    const { fence } = await stored(blobs);
    const id = dispatch();
    await repo.beginAttempt([fence], id, 600);
    expect(await activity(blobs).run([fence], id)).toEqual({
      embedded: 1,
      failed: [],
      skipped: [],
    });
    expect(await state(fence.assetId)).toEqual({
      status: "embedded",
      error_code: null,
      due: false,
      embeddings: 1,
    });
  });

  it("skips stale, deleted and unpublished items", async () => {
    const blobs = new MemoryBlobReader();
    const stale = await stored(blobs);
    const deleted = await stored(blobs);
    expect((await repo.deleteAsset(deleted.fence)).ok).toBe(true);
    const admission = await repo.admitAsset({
      source: "contract",
      externalId: `asset-${++counter}`,
    });
    if (admission.kind !== "admitted") throw new Error(admission.kind);
    const unpublished = {
      assetId: admission.assetId,
      generation: admission.generation,
    };
    const result = await activity(blobs).run([
      { ...stale.fence, generation: stale.fence.generation - 1 },
      deleted.fence,
      unpublished,
    ]);
    expect(result).toEqual({
      embedded: 0,
      failed: [],
      skipped: [
        { assetId: stale.fence.assetId, reason: "stale" },
        { assetId: deleted.fence.assetId, reason: "deleted" },
        { assetId: unpublished.assetId, reason: "not_ready" },
      ],
    });
    expect(blobs.reads).toBe(0);
  });

  it("skips an item whose content is replaced mid-batch and leaves the new generation alone", async () => {
    let replaced: { generation: number } | undefined;
    const blobs = new MemoryBlobReader({
      onRead: async () => {
        if (replaced) return;
        const published = await repo.publishBlob(item.fence, {
          sha256: sha(`replacement-${randomUUID()}`),
          ext: "webp",
          contentType: "image/webp",
          bytes: 3,
        });
        if (!published.ok) throw new Error(published.reason);
        replaced = { generation: published.value.generation };
      },
    });
    const item = await stored(blobs);
    const result = await activity(blobs).run([item.fence]);
    expect(result.skipped).toEqual([
      { assetId: item.fence.assetId, reason: "stale" },
    ]);
    expect(replaced?.generation).toBe(item.fence.generation + 1);
    expect(await state(item.fence.assetId)).toMatchObject({
      status: "admitted",
      embeddings: 0,
    });
  });

  it("marks undecodable bytes failed terminally", async () => {
    const blobs = new MemoryBlobReader();
    const { fence } = await stored(blobs, new Uint8Array([0xff, 0, 0]));
    const result = await activity(blobs).run([fence]);
    expect(result.failed).toEqual([
      { assetId: fence.assetId, code: "decode_failed", retryable: false },
    ]);
    expect(await state(fence.assetId)).toMatchObject({
      status: "failed",
      due: false,
    });
  });

  it("retries a storage timeout in the next dispatch and embeds it", async () => {
    let down = true;
    const blobs = new MemoryBlobReader({
      onRead: () => {
        if (down) throw new BlobReadError("fetch_timeout", "slow store");
      },
    });
    const { fence } = await stored(blobs);
    const first = dispatch();
    await repo.beginAttempt([fence], first, 600);
    const failed = await activity(blobs).run([fence], first);
    expect(failed.failed).toEqual([
      { assetId: fence.assetId, code: "fetch_timeout", retryable: true },
    ]);
    down = false;
    // A restart of the same dispatch leaves it to the next one
    expect((await activity(blobs).run([fence], first)).embedded).toBe(0);
    const second = dispatch();
    await repo.beginAttempt([fence], second, 600);
    expect((await activity(blobs).run([fence], second)).embedded).toBe(1);
    expect(await state(fence.assetId)).toMatchObject({
      status: "embedded",
      error_code: null,
      due: false,
    });
  });

  it("fails on a profile mismatch before any write", async () => {
    const blobs = new MemoryBlobReader();
    const { fence } = await stored(blobs);
    const error = await activity(blobs)
      .run([fence], dispatch(), profileId + 1000)
      .catch((e: unknown) => e);
    expect((error as ApplicationFailure).type).toBe("ProfileMismatch");
    expect(blobs.reads).toBe(0);
    expect(await state(fence.assetId)).toMatchObject({
      status: "stored",
      embeddings: 0,
    });
  });

  it("gives the complete result after an infrastructure failure and a rescheduled attempt", async () => {
    const blobs = new MemoryBlobReader();
    const items = await Promise.all(
      Array.from({ length: 8 }, () => stored(blobs)),
    );
    const fences = items.map((i) => i.fence);
    let calls = 0;
    const flaky = new Proxy(repo, {
      get(target, key, receiver) {
        const value = Reflect.get(target, key, receiver);
        if (key !== "writeEmbedding") return value;
        return (
          ...args: Parameters<SearchRepositoryService["writeEmbedding"]>
        ) => {
          if (++calls === 5) throw new Error("database unreachable");
          return target.writeEmbedding(...args);
        };
      },
    });
    const id = dispatch();
    await repo.beginAttempt(fences, id, 600);
    const error = await activity(blobs, { repository: flaky })
      .run(fences, id)
      .catch((e: unknown) => e);
    expect(String(error)).toContain("database unreachable");
    expect(await activity(blobs).run(fences, id)).toEqual({
      embedded: 8,
      failed: [],
      skipped: [],
    });
  });

  it("a batch and a repair embedding the same item end in one embedding and one duplicate", async () => {
    const blobs = new MemoryBlobReader({ delayMs: 50 });
    const { fence } = await stored(blobs);
    const shared = { permit: new PriorityPermit(), fetches: new Limiter(2) };
    const batch = activity(blobs, shared);
    const repair = activity(blobs, shared);
    const results = await Promise.all([
      batch.run([fence]),
      repair.run([fence]),
    ]);
    expect(results.map((r) => r.embedded)).toEqual([1, 1]);
    expect(batch.duplicates() + repair.duplicates()).toBe(1);
    expect(await state(fence.assetId)).toMatchObject({
      status: "embedded",
      embeddings: 1,
    });
  });
});

describe.skipIf(!process.env.S3_TEST_ENDPOINT)(
  "S3BlobReader against RustFS",
  () => {
    it("reads an object back and reports a missing one", async () => {
      const options = {
        endpoint: process.env.S3_TEST_ENDPOINT,
        region: process.env.S3_REGION ?? "us-east-1",
        bucket: process.env.S3_BUCKET ?? "projectx-assets",
        forcePathStyle: true,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      };
      const client = new S3Client({
        endpoint: options.endpoint,
        region: options.region,
        forcePathStyle: true,
        credentials: {
          accessKeyId: options.accessKeyId ?? "",
          secretAccessKey: options.secretAccessKey ?? "",
        },
      });
      const key = `staging/contract-${randomUUID()}.bin`;
      const bytes = new Uint8Array([7, 8, 9]);
      await client.send(
        new PutObjectCommand({ Bucket: options.bucket, Key: key, Body: bytes }),
      );
      const reader = new S3BlobReader(options);
      expect(await reader.get(key)).toEqual(bytes);
      const missing = await reader
        .get(`${key}.missing`)
        .catch((e: unknown) => e);
      expect((missing as BlobReadError).kind).toBe("object_missing");
      const small = new S3BlobReader({ ...options, maxBytes: 2 });
      expect(
        ((await small.get(key).catch((e: unknown) => e)) as BlobReadError).kind,
      ).toBe("too_large");
    });
  },
);
