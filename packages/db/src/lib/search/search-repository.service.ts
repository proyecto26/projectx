import { Inject, Injectable, Logger } from "@nestjs/common";

import { Prisma } from "../../../generated/prisma/client";
import { PrismaService } from "../prisma.service";

/**
 * Storage and queries for visual search (docs/ai/search/VISUAL_SEARCH.md).
 *
 * Every write to an asset or its child rows runs in one transaction that
 * first locks the asset row and checks the generation the caller expects.
 * Admission and deletion bump the generation under the same lock, so work
 * started for an older generation finds a mismatch and writes nothing.
 *
 * Lock order everywhere: product row, then asset rows by ascending id, then
 * blob hash locks in sorted order. No object store call happens inside a
 * transaction.
 */

type Tx = Prisma.TransactionClient;

/** Vector size of the v1 embedding profile */
export const EMBEDDING_DIMS = 768;
/** Dispatches per generation before an asset is left failed */
export const MAX_ATTEMPTS = 5;
/** When repair picks up an asset whose workflow never finished */
const REPAIR_AFTER = "15 minutes";
/** Unreferenced blobs are kept this long before garbage collection */
const GC_GRACE = "24 hours";
/** A blob stuck in `deleting` for this long is retried */
const GC_STUCK = "10 minutes";

/** What a step must hold to write an asset */
export type Fence = { assetId: number; generation: number };

export type FenceRejection = "missing" | "deleted" | "stale";

export type Fenced<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      reason:
        | FenceRejection
        | "not_ready"
        | "url_changed"
        | "content_changed"
        | "no_source"
        /** Failed with no retry left; only success or a new generation changes it */
        | "terminal";
    };

/** `asset.error_code`, a closed set; `asset.error` keeps the detail */
export const ERROR_CODES = [
  "fetch_timeout",
  "storage_unavailable",
  "object_missing",
  "too_large",
  "decode_failed",
  "unsupported_image",
  "inference_failed",
  "attempts_exhausted",
  "dispatch_failed",
  "profile_mismatch",
  "unknown",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type FailureInput = {
  code: ErrorCode;
  /** Full diagnostic, kept in the database only (first 2,000 characters) */
  message: string;
  retryable: boolean;
};

/** Why a dispatch left an item out */
export type DispatchExclusion =
  | FenceRejection
  | "embedded"
  | "terminal"
  | "attempts_exhausted";

export type DispatchResult = {
  /** Items the dispatcher may schedule */
  included: Fence[];
  excluded: { fence: Fence; reason: DispatchExclusion }[];
};

/** What the embedding activity needs to embed one item (read without a lock) */
export type EmbeddingInput = {
  blobId: number | null;
  storageKey: string | null;
  status: string;
  storedAt: Date | null;
  /** False once the asset is terminal (failed, no deadline) */
  retryable: boolean;
  /** The current generation has an embedding for the profile */
  embedded: boolean;
  /**
   * The asset's current failure was recorded by this dispatch: a restart of
   * the same dispatch leaves it to the next one (repair, after its backoff)
   */
  failedInDispatch: boolean;
};

/** An item's state at the end of a batch, read from the database */
export type ItemOutcome =
  | { fence: Fence; outcome: "embedded" }
  | {
      fence: Fence;
      outcome: "failed";
      errorCode: ErrorCode | null;
      retryable: boolean;
    }
  | {
      fence: Fence;
      outcome: "skipped";
      reason: FenceRejection | "not_ready" | "pending";
    };

export type EmbeddingProfileInput = {
  model: string;
  modelRevision: string;
  dims: number;
  /** Weights variant, e.g. q4 */
  dtype: string;
  /** Inference runtime and version, e.g. transformers.js@4.3.2 */
  runtime: string;
  documentTemplate: string;
  queryPrompt?: string | null;
  imageTokenBudget?: number | null;
};

export type AdmitAssetInput = {
  source: string;
  externalId: string;
  /** Fingerprint of the content to ingest. A retry with the same key reuses the generation. */
  admissionKey?: string | null;
  originUrl?: string | null;
  stagingKey?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
  credit?: string | null;
  name?: string | null;
  description?: string | null;
  tags?: string[];
};

export type Admission =
  | { kind: "admitted"; assetId: number; generation: number; reused: boolean }
  /** Same content as the current generation, which failed with no retry left */
  | {
      kind: "terminal";
      assetId: number;
      generation: number;
      errorCode: ErrorCode | null;
    }
  /** The (source, externalId) was deleted: only an explicit restore admits it again */
  | { kind: "suppressed"; assetId: number };

export type BlobInput = {
  sha256: string;
  /** File extension without the dot, e.g. webp */
  ext: string;
  contentType: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  colors?: string[];
};

export type PublishedBlob = {
  blobId: number;
  storageKey: string;
  /**
   * The generation to continue with. Replacing content the asset already had
   * starts a new generation, so work and search sessions for the old bytes
   * are fenced out.
   */
  generation: number;
  /** False when the asset already pointed at this content */
  changed: boolean;
};

export type BlobToDelete = { blobId: number; storageKey: string };

export type SearchFilters = {
  /** 0..1, cosine similarity */
  minSimilarity?: number;
  /** Dominant color names, any of them */
  colors?: string[];
  licenses?: string[];
  /** Product categories (product search only) */
  categories?: string[];
};

export type AssetHit = {
  assetId: number;
  generation: number;
  similarity: number;
  storageKey: string;
};

export type ProductVectorHit = {
  productId: number;
  assetId: number;
  generation: number;
  similarity: number;
  /** The indexed thumbnail, which is what was scored */
  storageKey: string;
};

export type ProductLexicalHit = { productId: number; trigram: number };

export type AssetSearchOptions = SearchFilters & {
  profileId: number;
  limit: number;
  /** HNSW candidate list size, at least `limit` */
  efSearch?: number;
  /** Upper bound on tuples an iterative scan visits */
  maxScanTuples?: number;
  /** Discourage exact plans, so tests exercise the HNSW path on small data */
  preferIndex?: boolean;
};

type LockedAsset = {
  id: number;
  ingest_generation: number;
  deleted_at: Date | null;
  blob_id: number | null;
  status: string;
  stored_at: Date | null;
  next_attempt_at: Date | null;
  attempts: number;
};

/** Failed with no deadline: no retry left */
const isTerminal = (row: Pick<LockedAsset, "status" | "next_attempt_at">) =>
  row.status === "failed" && row.next_attempt_at === null;

const RETRYABLE = new Set(["40P01", "40001"]);

/**
 * SQLSTATE of a database error. Prisma wraps it: its own code (e.g. P2010)
 * is on the outside, the driver's code is in `cause.originalCode`.
 */
export function sqlState(error: unknown): string | undefined {
  const isSqlState = (value: unknown): value is string =>
    typeof value === "string" && /^[0-9A-Z]{5}$/.test(value);
  for (const key of ["originalCode", "sqlState", "code"]) {
    const seen = new Set<unknown>();
    const visit = (value: unknown, depth: number): string | undefined => {
      if (typeof value !== "object" || value === null || depth > 5) return;
      if (seen.has(value)) return;
      seen.add(value);
      const record = value as Record<string, unknown>;
      // Prisma's own codes look like P2010, never a driver SQLSTATE here
      if (
        isSqlState(record[key]) &&
        !(key === "code" && /^P2\d{3}$/.test(record[key]))
      ) {
        return record[key];
      }
      for (const child of ["cause", "meta", "driverAdapterError"]) {
        const found = visit(record[child], depth + 1);
        if (found) return found;
      }
      return;
    };
    const found = visit(error, 0);
    if (found) return found;
  }
  return;
}

export const toVector = (values: readonly number[]): string => {
  if (values.length !== EMBEDDING_DIMS) {
    throw new Error(
      `Expected ${EMBEDDING_DIMS} dimensions, got ${values.length}`,
    );
  }
  for (const value of values) {
    if (!Number.isFinite(value))
      throw new Error("Vector has a non-finite value");
  }
  return `[${values.join(",")}]`;
};

const storageKeyOf = (sha256: string, blobId: number, ext: string) =>
  `assets/${sha256}-${blobId}.${ext}`;

@Injectable()
export class SearchRepositoryService {
  private logger = new Logger(SearchRepositoryService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Runs a transaction, retrying deadlocks and serialization failures */
  private async transaction<T>(
    name: string,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          maxWait: 10_000,
          timeout: 30_000,
        });
      } catch (error) {
        const code = sqlState(error);
        if (!code || !RETRYABLE.has(code) || attempt >= 3) throw error;
        this.logger.warn(
          `${name}: retrying after ${code} (attempt ${attempt})`,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 20 * attempt + Math.random() * 50),
        );
      }
    }
  }

  private async lockAsset(tx: Tx, assetId: number) {
    const [row] = await tx.$queryRaw<LockedAsset[]>`
      SELECT id, ingest_generation, deleted_at, blob_id, status::text AS status, stored_at,
        next_attempt_at, attempts
      FROM asset WHERE id = ${assetId} FOR UPDATE`;
    return row;
  }

  /** Locks several assets, in ascending id order (see the lock order above) */
  private async lockAssets(tx: Tx, fences: readonly Fence[]) {
    const ids = [...new Set(fences.map((f) => f.assetId))].sort(
      (a, b) => a - b,
    );
    const rows = await tx.$queryRaw<LockedAsset[]>`
      SELECT id, ingest_generation, deleted_at, blob_id, status::text AS status, stored_at,
        next_attempt_at, attempts
      FROM asset WHERE id = ANY(${ids}::int[]) ORDER BY id FOR UPDATE`;
    return new Map(rows.map((row) => [row.id, row]));
  }

  /** Why a dispatch can't touch this item, or null if it can */
  private static dispatchBlocker(
    row: LockedAsset | undefined,
    fence: Fence,
  ): DispatchExclusion | null {
    if (!row) return "missing";
    if (row.deleted_at) return "deleted";
    if (row.ingest_generation !== fence.generation) return "stale";
    if (row.status === "embedded") return "embedded";
    if (isTerminal(row)) return "terminal";
    return null;
  }

  /** A new generation starts with a fresh attempt budget */
  private async resetDispatches(tx: Tx, assetId: number) {
    await tx.$executeRaw`DELETE FROM asset_dispatch WHERE asset_id = ${assetId}`;
  }

  /** Locks the asset and checks the caller's generation */
  private async checkFence(
    tx: Tx,
    fence: Fence,
  ): Promise<{ row: LockedAsset } | { reason: FenceRejection }> {
    const row = await this.lockAsset(tx, fence.assetId);
    if (!row) return { reason: "missing" };
    if (row.deleted_at) return { reason: "deleted" };
    if (row.ingest_generation !== fence.generation) return { reason: "stale" };
    return { row };
  }

  private async lockHashes(tx: Tx, hashes: (string | null | undefined)[]) {
    const sorted = [...new Set(hashes.filter((h): h is string => !!h))].sort();
    for (const sha256 of sorted) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sha256}, 0))`;
    }
  }

  private async blobHash(tx: Tx, blobId: number | null) {
    if (blobId === null) return null;
    const [row] = await tx.$queryRaw<{ sha256: string }[]>`
      SELECT sha256 FROM blob WHERE id = ${blobId}`;
    return row?.sha256 ?? null;
  }

  /** Marks a blob unreferenced if no asset points at it any more */
  private async releaseBlob(tx: Tx, blobId: number | null) {
    if (blobId === null) return;
    await tx.$executeRaw`
      UPDATE blob SET unreferenced_since = now()
      WHERE id = ${blobId} AND unreferenced_since IS NULL
        AND NOT EXISTS (SELECT 1 FROM asset WHERE blob_id = ${blobId})`;
  }

  async ensureProfile(profile: EmbeddingProfileInput): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO embedding_profile
        (model, model_revision, dims, dtype, runtime, document_template, query_prompt, image_token_budget)
      VALUES (${profile.model}, ${profile.modelRevision}, ${profile.dims},
        ${profile.dtype}, ${profile.runtime},
        ${profile.documentTemplate}, ${profile.queryPrompt ?? null}, ${profile.imageTokenBudget ?? null})
      ON CONFLICT (model, model_revision, dims, dtype, runtime, document_template) DO NOTHING
      RETURNING id`;
    if (row) return row.id;
    const [existing] = await this.prisma.$queryRaw<
      {
        id: number;
        query_prompt: string | null;
        image_token_budget: number | null;
      }[]
    >`
      SELECT id, query_prompt, image_token_budget FROM embedding_profile
      WHERE model = ${profile.model} AND model_revision = ${profile.modelRevision}
        AND dims = ${profile.dims} AND dtype = ${profile.dtype}
        AND runtime = ${profile.runtime} AND document_template = ${profile.documentTemplate}`;
    // Stored vectors were made with these settings: changing them is a new profile
    if (
      existing.query_prompt !== (profile.queryPrompt ?? null) ||
      existing.image_token_budget !== (profile.imageTokenBudget ?? null)
    ) {
      throw new Error(
        `Embedding profile ${existing.id} exists with other settings; register a new model revision instead`,
      );
    }
    return existing.id;
  }

  /**
   * Creates the asset row, or starts a new generation of an existing one.
   * The row exists before anything is downloaded, so a crash at any later
   * step leaves something repair can find.
   */
  async admitAsset(input: AdmitAssetInput): Promise<Admission> {
    return this.transaction("admitAsset", async (tx) => {
      const [created] = await tx.$queryRaw<{ id: number }[]>`
        INSERT INTO asset (source, external_id, admission_key, origin_url, staging_key,
          source_url, license, credit, name, description, tags,
          ingest_generation, status, next_attempt_at)
        VALUES (${input.source}, ${input.externalId}, ${input.admissionKey ?? null},
          ${input.originUrl ?? null}, ${input.stagingKey ?? null}, ${input.sourceUrl ?? null},
          ${input.license ?? null}, ${input.credit ?? null}, ${input.name ?? null},
          ${input.description ?? null}, ${input.tags ?? []},
          1, 'admitted', now() + ${REPAIR_AFTER}::interval)
        ON CONFLICT (source, external_id) DO NOTHING
        RETURNING id`;
      if (created) {
        return {
          kind: "admitted",
          assetId: created.id,
          generation: 1,
          reused: false,
        };
      }

      const [existing] = await tx.$queryRaw<
        (LockedAsset & {
          admission_key: string | null;
          error_code: ErrorCode | null;
        })[]
      >`
        SELECT id, ingest_generation, deleted_at, blob_id, status::text AS status, stored_at,
          next_attempt_at, attempts, admission_key, error_code
        FROM asset WHERE source = ${input.source} AND external_id = ${input.externalId}
        FOR UPDATE`;
      if (existing.deleted_at)
        return { kind: "suppressed", assetId: existing.id };

      // Same content again (a retried request or a concurrent duplicate):
      // the current generation, whatever its status. A failed asset keeps its
      // attempts and deadline; a terminal one stays terminal.
      if (input.admissionKey && existing.admission_key === input.admissionKey) {
        if (isTerminal(existing)) {
          return {
            kind: "terminal",
            assetId: existing.id,
            generation: existing.ingest_generation,
            errorCode: existing.error_code,
          };
        }
        return {
          kind: "admitted",
          assetId: existing.id,
          generation: existing.ingest_generation,
          reused: true,
        };
      }

      // New content: the old vector must never be served with it
      await tx.$executeRaw`DELETE FROM asset_embedding WHERE asset_id = ${existing.id}`;
      await this.resetDispatches(tx, existing.id);
      const [updated] = await tx.$queryRaw<{ ingest_generation: number }[]>`
        UPDATE asset SET
          ingest_generation = ingest_generation + 1,
          status = 'admitted', stored_at = NULL, error = NULL, error_code = NULL, attempts = 0,
          next_attempt_at = now() + ${REPAIR_AFTER}::interval,
          admission_key = ${input.admissionKey ?? null},
          origin_url = ${input.originUrl ?? null},
          staging_key = ${input.stagingKey ?? null},
          source_url = COALESCE(${input.sourceUrl ?? null}, source_url),
          license = COALESCE(${input.license ?? null}, license),
          credit = COALESCE(${input.credit ?? null}, credit),
          name = COALESCE(${input.name ?? null}, name),
          description = COALESCE(${input.description ?? null}, description),
          tags = COALESCE(${input.tags ?? null}, tags),
          updated_at = now()
        WHERE id = ${existing.id}
        RETURNING ingest_generation`;
      return {
        kind: "admitted",
        assetId: existing.id,
        generation: updated.ingest_generation,
        reused: false,
      };
    });
  }

  /**
   * Repair invariant: a successful step that leaves the asset short of
   * `embedded` (re)schedules repair, whatever an overlapping failure set.
   * A terminal failure after storage is about these very bytes and stays.
   */
  private async scheduleRepair(tx: Tx, assetId: number) {
    await tx.$executeRaw`
      UPDATE asset SET next_attempt_at = GREATEST(
          COALESCE(next_attempt_at, now() + ${REPAIR_AFTER}::interval),
          now() + ${REPAIR_AFTER}::interval)
      WHERE id = ${assetId} AND status <> 'embedded'
        AND NOT (status = 'failed' AND next_attempt_at IS NULL AND stored_at IS NOT NULL)`;
  }

  /**
   * The current publication if `fence` is the generation a replacement with
   * these bytes started from, so the caller can continue with it.
   */
  private async resumeReplacement(
    tx: Tx,
    fence: Fence,
    sha256: string,
  ): Promise<PublishedBlob | null> {
    const [row] = await tx.$queryRaw<
      { blob_id: number; storage_key: string; ingest_generation: number }[]
    >`
      SELECT a.blob_id, b.storage_key, a.ingest_generation
      FROM asset a JOIN blob b ON b.id = a.blob_id
      WHERE a.id = ${fence.assetId} AND a.deleted_at IS NULL
        AND a.replaced_from_generation = ${fence.generation}
        AND a.ingest_generation = ${fence.generation} + 1
        AND b.sha256 = ${sha256}`;
    if (!row) return null;
    return {
      blobId: row.blob_id,
      storageKey: row.storage_key,
      generation: row.ingest_generation,
      changed: true,
    };
  }

  /**
   * Points the asset at the blob for these bytes, creating the blob if no
   * live one has this hash. Call before writing the object: once this
   * commits, garbage collection can't claim the blob. The object is then
   * written at `storageKey` (idempotent, same bytes).
   */
  async publishBlob(
    fence: Fence,
    blob: BlobInput,
  ): Promise<Fenced<PublishedBlob>> {
    if (!/^[0-9a-f]{64}$/.test(blob.sha256)) throw new Error("Invalid sha256");
    if (!/^[a-z0-9]{1,8}$/.test(blob.ext)) throw new Error("Invalid extension");

    return this.transaction("publishBlob", async (tx) => {
      const fenced = await this.checkFence(tx, fence);
      if ("reason" in fenced) {
        // A retry of a replacement that committed but whose caller never
        // learned it: same bytes, from the generation the replacement left
        if (fenced.reason !== "stale")
          return { ok: false, reason: fenced.reason };
        const resumed = await this.resumeReplacement(tx, fence, blob.sha256);
        if (!resumed) return { ok: false, reason: "stale" };
        await this.scheduleRepair(tx, fence.assetId);
        return { ok: true, value: resumed };
      }
      const previousBlobId = fenced.row.blob_id;
      const previousHash = await this.blobHash(tx, previousBlobId);
      await this.lockHashes(tx, [blob.sha256, previousHash]);

      if (previousHash === blob.sha256 && previousBlobId !== null) {
        const [current] = await tx.$queryRaw<{ storage_key: string }[]>`
          SELECT storage_key FROM blob WHERE id = ${previousBlobId}`;
        await this.scheduleRepair(tx, fence.assetId);
        return {
          ok: true,
          value: {
            blobId: previousBlobId,
            storageKey: current.storage_key,
            generation: fence.generation,
            changed: false,
          },
        };
      }

      let [live] = await tx.$queryRaw<{ id: number; storage_key: string }[]>`
        SELECT id, storage_key FROM blob WHERE sha256 = ${blob.sha256} AND state = 'live'`;
      if (live) {
        await tx.$executeRaw`UPDATE blob SET unreferenced_since = NULL WHERE id = ${live.id}`;
      } else {
        const [{ id }] = await tx.$queryRaw<{ id: number }[]>`
          SELECT nextval(pg_get_serial_sequence('blob', 'id'))::int AS id`;
        const storageKey = storageKeyOf(blob.sha256, id, blob.ext);
        [live] = await tx.$queryRaw<{ id: number; storage_key: string }[]>`
          INSERT INTO blob (id, sha256, storage_key, content_type, bytes, width, height, colors)
          VALUES (${id}, ${blob.sha256}, ${storageKey}, ${blob.contentType}, ${blob.bytes},
            ${blob.width ?? null}, ${blob.height ?? null}, ${blob.colors ?? []})
          RETURNING id, storage_key`;
      }

      // Different bytes: whatever was embedded or stored before no longer
      // applies, and replacing content is a new generation
      const replacing = previousBlobId === null ? 0 : 1;
      await tx.$executeRaw`DELETE FROM asset_embedding WHERE asset_id = ${fence.assetId}`;
      if (replacing) await this.resetDispatches(tx, fence.assetId);
      const [{ ingest_generation }] = await tx.$queryRaw<
        { ingest_generation: number }[]
      >`
        UPDATE asset SET blob_id = ${live.id}, status = 'admitted', stored_at = NULL,
          content_revision = content_revision + ${replacing},
          ingest_generation = ingest_generation + ${replacing},
          replaced_from_generation = CASE WHEN ${replacing} = 1
            THEN ${fence.generation} ELSE replaced_from_generation END,
          attempts = CASE WHEN ${replacing} = 1 THEN 0 ELSE attempts END,
          error = CASE WHEN ${replacing} = 1 THEN NULL ELSE error END,
          error_code = CASE WHEN ${replacing} = 1 THEN NULL ELSE error_code END,
          -- Same generation: a dispatch's later deferral is kept; a new one starts over
          next_attempt_at = CASE WHEN ${replacing} = 1
            THEN now() + ${REPAIR_AFTER}::interval
            ELSE GREATEST(next_attempt_at, now() + ${REPAIR_AFTER}::interval) END,
          updated_at = now()
        WHERE id = ${fence.assetId}
        RETURNING ingest_generation`;
      await this.releaseBlob(tx, previousBlobId);
      return {
        ok: true,
        value: {
          blobId: live.id,
          storageKey: live.storage_key,
          generation: ingest_generation,
          changed: true,
        },
      };
    });
  }

  /**
   * The object for `blobId` is written: the staging copy can go. Fails with
   * `content_changed` if the asset was pointed at other bytes meanwhile.
   */
  async markStored(fence: Fence, blobId: number): Promise<Fenced<null>> {
    return this.transaction("markStored", async (tx) => {
      const fenced = await this.checkFence(tx, fence);
      if ("reason" in fenced) return { ok: false, reason: fenced.reason };
      if (fenced.row.blob_id === null)
        return { ok: false, reason: "not_ready" };
      if (fenced.row.blob_id !== blobId) {
        return { ok: false, reason: "content_changed" };
      }
      // A repeated completion must not move an embedded asset back
      if (fenced.row.status === "embedded" || fenced.row.status === "stored") {
        return { ok: true, value: null };
      }
      // A terminal failure about these stored bytes stays terminal
      if (isTerminal(fenced.row) && fenced.row.stored_at !== null) {
        return { ok: false, reason: "terminal" };
      }
      await tx.$executeRaw`
        UPDATE asset SET status = 'stored', stored_at = now(), staging_key = NULL,
          error = NULL, error_code = NULL,
          -- Stored but not embedded yet: repair stays scheduled until writeEmbedding,
          -- whatever an earlier (overlapping) failure set; a later deadline (a
          -- dispatch's deferral) is kept
          next_attempt_at = GREATEST(next_attempt_at, now() + ${REPAIR_AFTER}::interval),
          updated_at = now()
        WHERE id = ${fence.assetId}`;
      return { ok: true, value: null };
    });
  }

  /**
   * Stores the vector computed from `blobId`'s bytes. A vector for bytes the
   * asset no longer points at is rejected with `content_changed`.
   * `duplicate`: this generation already had a vector for the profile (another
   * attempt embedded the same item), counted as `duplicate_inference`.
   */
  async writeEmbedding(
    fence: Fence,
    blobId: number,
    profileId: number,
    embedding: readonly number[],
  ): Promise<Fenced<{ duplicate: boolean }>> {
    const vector = toVector(embedding);
    return this.transaction("writeEmbedding", async (tx) => {
      const fenced = await this.checkFence(tx, fence);
      if ("reason" in fenced) return { ok: false, reason: fenced.reason };
      const { row } = fenced;
      // Success wins: a failure recorded for the same stored bytes (by an
      // overlapping attempt, retryable or not) doesn't stop this vector
      const storedBytes =
        row.status === "stored" ||
        row.status === "embedded" ||
        (row.status === "failed" && row.stored_at !== null);
      if (row.blob_id === null || !storedBytes) {
        return { ok: false, reason: "not_ready" };
      }
      if (row.blob_id !== blobId)
        return { ok: false, reason: "content_changed" };
      const [existing] = await tx.$queryRaw<{ duplicate: boolean }[]>`
        SELECT EXISTS (SELECT 1 FROM asset_embedding
          WHERE asset_id = ${fence.assetId} AND profile_id = ${profileId}
            AND ingest_generation = ${fence.generation}) AS duplicate`;
      await tx.$executeRaw`
        INSERT INTO asset_embedding (asset_id, profile_id, input_revision, ingest_generation, embedding)
        SELECT ${fence.assetId}, ${profileId}, content_revision, ${fence.generation}, ${vector}::halfvec(768)
        FROM asset WHERE id = ${fence.assetId}
        ON CONFLICT (asset_id, profile_id) DO UPDATE SET
          input_revision = EXCLUDED.input_revision,
          ingest_generation = EXCLUDED.ingest_generation,
          embedding = EXCLUDED.embedding,
          created_at = now()`;
      await tx.$executeRaw`
        UPDATE asset SET status = 'embedded', error = NULL, error_code = NULL,
          next_attempt_at = NULL, updated_at = now()
        WHERE id = ${fence.assetId}`;
      return { ok: true, value: { duplicate: existing.duplicate } };
    });
  }

  /**
   * Records a failure on the content it was about: `blobId`, or null for a
   * failure before publication (download, validation). A late failure for
   * other bytes, a pre-publication failure after the bytes were stored, or
   * any failure after the asset was embedded changes nothing; a terminal
   * failure stays as it is (`terminal`).
   *
   * Doesn't count attempts (beginAttempt counts dispatches). A retryable
   * failure keeps a deadline, with backoff from the attempts so far, even at
   * the cap: the next dispatch, usually repair, terminalizes it.
   *
   * `dispatchId`: the dispatch that processed the item. Its dispatch row
   * records the failure, so a restart of that dispatch doesn't retry the
   * item before its backoff (EmbeddingInput.failedInDispatch).
   */
  async markFailed(
    fence: Fence,
    blobId: number | null,
    failure: FailureInput,
    dispatchId?: string,
  ): Promise<Fenced<{ attempts: number; nextAttemptAt: Date | null }>> {
    if (!ERROR_CODES.includes(failure.code)) {
      throw new Error(`Unknown error code: ${failure.code}`);
    }
    return this.transaction("markFailed", async (tx) => {
      const fenced = await this.checkFence(tx, fence);
      if ("reason" in fenced) return { ok: false, reason: fenced.reason };
      const { row: current } = fenced;
      // Stored or embedded content can't have failed before publication
      if (
        current.status === "embedded" ||
        (blobId === null && current.stored_at !== null)
      ) {
        return { ok: false, reason: "stale" };
      }
      if (blobId !== null && current.blob_id !== blobId) {
        return { ok: false, reason: "content_changed" };
      }
      if (isTerminal(current)) return { ok: false, reason: "terminal" };
      const [row] = await tx.$queryRaw<
        { attempts: number; next_attempt_at: Date | null }[]
      >`
        UPDATE asset SET status = 'failed', error = ${failure.message.slice(0, 2000)},
          error_code = ${failure.code},
          next_attempt_at = CASE
            WHEN ${failure.retryable}
            THEN now() + make_interval(mins => power(2, GREATEST(attempts, 1))::int)
            ELSE NULL END,
          updated_at = now()
        WHERE id = ${fence.assetId}
        RETURNING attempts, next_attempt_at`;
      if (dispatchId !== undefined) {
        await tx.$executeRaw`
          UPDATE asset_dispatch SET failed_at = now()
          WHERE asset_id = ${fence.assetId} AND ingest_generation = ${fence.generation}
            AND dispatch_id = ${dispatchId}`;
      }
      return {
        ok: true,
        value: { attempts: row.attempts, nextAttemptAt: row.next_attempt_at },
      };
    });
  }

  /**
   * Counts one attempt per dispatch and defers repair while the work is
   * queued or running (EMBEDDINGS_SERVICE.md, Failures). Call before
   * scheduling, with the same `dispatchId` on every retry that didn't reach
   * the work: an existing dispatch is never counted twice and stays included,
   * even when it was the one that reached the cap. A new dispatch for an
   * asset already at MAX_ATTEMPTS terminalizes it (`attempts_exhausted`).
   * Embedded, terminal, deleted and stale items are excluded untouched.
   */
  async beginAttempt(
    fences: readonly Fence[],
    dispatchId: string,
    deferSeconds: number,
  ): Promise<DispatchResult> {
    if (!dispatchId || dispatchId.length > 128) {
      throw new Error("dispatchId must be 1 to 128 characters");
    }
    if (!Number.isFinite(deferSeconds) || deferSeconds <= 0) {
      throw new Error("deferSeconds must be positive");
    }
    if (fences.length === 0) return { included: [], excluded: [] };
    return this.transaction("beginAttempt", async (tx) => {
      const rows = await this.lockAssets(tx, fences);
      const result: DispatchResult = { included: [], excluded: [] };
      const open: Fence[] = [];
      for (const fence of fences) {
        const reason = SearchRepositoryService.dispatchBlocker(
          rows.get(fence.assetId),
          fence,
        );
        if (reason) result.excluded.push({ fence, reason });
        else open.push(fence);
      }
      if (open.length === 0) return result;

      const openIds = open.map((f) => f.assetId);
      const seen = await tx.$queryRaw<{ asset_id: number }[]>`
        SELECT d.asset_id FROM asset_dispatch d JOIN asset a
          ON a.id = d.asset_id AND a.ingest_generation = d.ingest_generation
        WHERE d.dispatch_id = ${dispatchId} AND d.asset_id = ANY(${openIds}::int[])`;
      const counted = new Set(seen.map((r) => r.asset_id));

      const fresh: Fence[] = [];
      const exhausted: Fence[] = [];
      for (const fence of open) {
        if (counted.has(fence.assetId)) continue;
        const row = rows.get(fence.assetId) as LockedAsset;
        (row.attempts >= MAX_ATTEMPTS ? exhausted : fresh).push(fence);
      }
      if (fresh.length > 0) {
        const ids = fresh.map((f) => f.assetId);
        const generations = fresh.map((f) => f.generation);
        await tx.$executeRaw`
          INSERT INTO asset_dispatch (asset_id, ingest_generation, dispatch_id)
          SELECT asset_id, ingest_generation, ${dispatchId}
          FROM unnest(${ids}::int[], ${generations}::int[]) AS t(asset_id, ingest_generation)
          ON CONFLICT DO NOTHING`;
        await tx.$executeRaw`
          UPDATE asset SET attempts = attempts + 1 WHERE id = ANY(${ids}::int[])`;
      }
      if (exhausted.length > 0) {
        await tx.$executeRaw`
          UPDATE asset SET status = 'failed', error_code = 'attempts_exhausted',
            error = ${`No attempts left after ${MAX_ATTEMPTS} dispatches`},
            next_attempt_at = NULL, updated_at = now()
          WHERE id = ANY(${exhausted.map((f) => f.assetId)}::int[])`;
        for (const fence of exhausted) {
          result.excluded.push({ fence, reason: "attempts_exhausted" });
        }
      }
      const exhaustedIds = new Set(exhausted.map((f) => f.assetId));
      result.included = open.filter((f) => !exhaustedIds.has(f.assetId));
      await this.deferDeadlines(
        tx,
        result.included.map((f) => f.assetId),
        deferSeconds,
      );
      return result;
    });
  }

  /** Only ever moves a deadline later */
  private async deferDeadlines(tx: Tx, ids: number[], seconds: number) {
    if (ids.length === 0) return;
    await tx.$executeRaw`
      UPDATE asset SET next_attempt_at = GREATEST(
          COALESCE(next_attempt_at, now() + make_interval(secs => ${seconds})),
          now() + make_interval(secs => ${seconds})),
        updated_at = now()
      WHERE id = ANY(${ids}::int[])`;
  }

  /**
   * Pushes the repair deadline of items still being worked on (called from
   * the activity's heartbeat cadence). No attempt is counted; embedded,
   * terminal, deleted and stale items are left alone. Returns how many moved.
   */
  async deferRepair(
    fences: readonly Fence[],
    deferSeconds: number,
  ): Promise<number> {
    if (!Number.isFinite(deferSeconds) || deferSeconds <= 0) {
      throw new Error("deferSeconds must be positive");
    }
    if (fences.length === 0) return 0;
    return this.transaction("deferRepair", async (tx) => {
      const rows = await this.lockAssets(tx, fences);
      const ids = fences
        .filter(
          (f) =>
            !SearchRepositoryService.dispatchBlocker(rows.get(f.assetId), f),
        )
        .map((f) => f.assetId);
      await this.deferDeadlines(tx, ids, deferSeconds);
      return ids.length;
    });
  }

  /**
   * A dispatcher gave up (its retry budget spent, or a non-retryable outcome):
   * the items it dispatched that are still pending become terminal with
   * `code`. Embedded items are untouched (success wins). Returns the fences
   * that were terminalized.
   */
  async exhaustAttempts(
    fences: readonly Fence[],
    dispatchId: string,
    code: Extract<ErrorCode, "dispatch_failed" | "profile_mismatch">,
  ): Promise<Fence[]> {
    if (fences.length === 0) return [];
    return this.transaction("exhaustAttempts", async (tx) => {
      const rows = await this.lockAssets(tx, fences);
      const open = fences.filter(
        (f) => !SearchRepositoryService.dispatchBlocker(rows.get(f.assetId), f),
      );
      if (open.length === 0) return [];
      // Only the latest dispatch counted for the generation may give up on an
      // item: a newer (overlapping) dispatch owns its outcome, and a dispatch
      // that was never counted for this generation owns nothing
      const owned = await tx.$queryRaw<{ asset_id: number }[]>`
        SELECT d.asset_id FROM asset_dispatch d
        JOIN unnest(${open.map((f) => f.assetId)}::int[], ${open.map((f) => f.generation)}::int[])
          AS t(asset_id, ingest_generation)
          ON t.asset_id = d.asset_id AND t.ingest_generation = d.ingest_generation
        WHERE d.dispatch_id = ${dispatchId}
          AND NOT EXISTS (SELECT 1 FROM asset_dispatch n
            WHERE n.asset_id = d.asset_id AND n.ingest_generation = d.ingest_generation
              AND n.seq > d.seq)`;
      const ownedIds = new Set(owned.map((r) => r.asset_id));
      const pending = open.filter((f) => ownedIds.has(f.assetId));
      if (pending.length > 0) {
        await tx.$executeRaw`
          UPDATE asset SET status = 'failed', error_code = ${code},
            error = ${`Dispatch ${dispatchId} gave up`.slice(0, 2000)},
            next_attempt_at = NULL, updated_at = now()
          WHERE id = ANY(${pending.map((f) => f.assetId)}::int[])`;
      }
      return pending;
    });
  }

  /** What the embedding activity reads before embedding an item (no lock) */
  async embeddingInput(
    fence: Fence,
    profileId: number,
    dispatchId?: string,
  ): Promise<Fenced<EmbeddingInput>> {
    const [row] = await this.prisma.$queryRaw<
      {
        ingest_generation: number;
        deleted_at: Date | null;
        blob_id: number | null;
        storage_key: string | null;
        status: string;
        stored_at: Date | null;
        next_attempt_at: Date | null;
        embedded: boolean;
        failed_in_dispatch: boolean;
      }[]
    >`
      SELECT a.ingest_generation, a.deleted_at, a.blob_id, b.storage_key,
        a.status::text AS status, a.stored_at, a.next_attempt_at,
        EXISTS (SELECT 1 FROM asset_embedding e
          WHERE e.asset_id = a.id AND e.profile_id = ${profileId}
            AND e.ingest_generation = a.ingest_generation) AS embedded,
        (a.status = 'failed' AND EXISTS (SELECT 1 FROM asset_dispatch d
          WHERE d.asset_id = a.id AND d.ingest_generation = a.ingest_generation
            AND d.dispatch_id = ${dispatchId ?? null} AND d.failed_at IS NOT NULL))
          AS failed_in_dispatch
      FROM asset a LEFT JOIN blob b ON b.id = a.blob_id
      WHERE a.id = ${fence.assetId}`;
    if (!row) return { ok: false, reason: "missing" };
    if (row.deleted_at) return { ok: false, reason: "deleted" };
    if (row.ingest_generation !== fence.generation)
      return { ok: false, reason: "stale" };
    return {
      ok: true,
      value: {
        blobId: row.blob_id,
        storageKey: row.storage_key,
        status: row.status,
        storedAt: row.stored_at,
        retryable: !isTerminal(row),
        embedded: row.embedded,
        failedInDispatch: row.failed_in_dispatch,
      },
    };
  }

  /**
   * Each item's state for `profileId`, whoever wrote it: the result of a
   * batch is defined by the database, so it is the same whether or not an
   * attempt crashed in between. One read for the whole batch.
   */
  async batchOutcome(
    fences: readonly Fence[],
    profileId: number,
  ): Promise<ItemOutcome[]> {
    if (fences.length === 0) return [];
    const ids = [...new Set(fences.map((f) => f.assetId))];
    const rows = await this.prisma.$queryRaw<
      {
        id: number;
        ingest_generation: number;
        deleted_at: Date | null;
        status: string;
        stored_at: Date | null;
        next_attempt_at: Date | null;
        error_code: ErrorCode | null;
        embedded: boolean;
      }[]
    >`
      SELECT a.id, a.ingest_generation, a.deleted_at, a.status::text AS status,
        a.stored_at, a.next_attempt_at, a.error_code,
        EXISTS (SELECT 1 FROM asset_embedding e
          WHERE e.asset_id = a.id AND e.profile_id = ${profileId}
            AND e.ingest_generation = a.ingest_generation) AS embedded
      FROM asset a WHERE a.id = ANY(${ids}::int[])`;
    const byId = new Map(rows.map((row) => [row.id, row]));
    return fences.map((fence): ItemOutcome => {
      const row = byId.get(fence.assetId);
      if (!row) return { fence, outcome: "skipped", reason: "missing" };
      if (row.deleted_at)
        return { fence, outcome: "skipped", reason: "deleted" };
      if (row.ingest_generation !== fence.generation)
        return { fence, outcome: "skipped", reason: "stale" };
      if (row.embedded) return { fence, outcome: "embedded" };
      if (row.status === "failed") {
        return {
          fence,
          outcome: "failed",
          errorCode: row.error_code,
          retryable: row.next_attempt_at !== null,
        };
      }
      if (row.stored_at === null)
        return { fence, outcome: "skipped", reason: "not_ready" };
      return { fence, outcome: "skipped", reason: "pending" };
    });
  }

  /**
   * Tombstones the asset: removes its links and embeddings and detaches the
   * blob, which garbage collection deletes later if nothing else uses it.
   * Takes the expected generation, so a delayed delete can't remove content
   * that was re-admitted after it was requested.
   */
  async deleteAsset(fence: Fence): Promise<Fenced<{ generation: number }>> {
    return this.transaction("deleteAsset", async (tx) => {
      const fenced = await this.checkFence(tx, fence);
      if ("reason" in fenced) return { ok: false, reason: fenced.reason };
      const blobId = fenced.row.blob_id;
      await this.lockHashes(tx, [await this.blobHash(tx, blobId)]);
      await tx.$executeRaw`DELETE FROM product_asset WHERE asset_id = ${fence.assetId}`;
      await tx.$executeRaw`DELETE FROM asset_embedding WHERE asset_id = ${fence.assetId}`;
      await this.resetDispatches(tx, fence.assetId);
      const [row] = await tx.$queryRaw<{ ingest_generation: number }[]>`
        UPDATE asset SET deleted_at = now(), stored_at = NULL, ingest_generation = ingest_generation + 1,
          blob_id = NULL, next_attempt_at = NULL, updated_at = now()
        WHERE id = ${fence.assetId}
        RETURNING ingest_generation`;
      await this.releaseBlob(tx, blobId);
      return { ok: true, value: { generation: row.ingest_generation } };
    });
  }

  /**
   * Clears a tombstone and admits a new generation, which re-fetches the
   * bytes from `origin_url`. Deletion dropped the staging copy and the blob
   * reference, so an asset without an origin (an upload) can't be restored:
   * it has to be uploaded again (`no_source`).
   */
  async restoreAsset(assetId: number): Promise<Fenced<Fence>> {
    return this.transaction("restoreAsset", async (tx) => {
      const row = await this.lockAsset(tx, assetId);
      if (!row) return { ok: false, reason: "missing" };
      if (!row.deleted_at) return { ok: false, reason: "stale" };
      const [{ origin_url }] = await tx.$queryRaw<
        { origin_url: string | null }[]
      >`
        SELECT origin_url FROM asset WHERE id = ${assetId}`;
      if (origin_url === null) return { ok: false, reason: "no_source" };
      await this.resetDispatches(tx, assetId);
      const [updated] = await tx.$queryRaw<{ ingest_generation: number }[]>`
        UPDATE asset SET deleted_at = NULL, ingest_generation = ingest_generation + 1,
          status = 'admitted', stored_at = NULL, error = NULL, error_code = NULL, attempts = 0,
          admission_key = NULL,
          next_attempt_at = now() + ${REPAIR_AFTER}::interval, updated_at = now()
        WHERE id = ${assetId}
        RETURNING ingest_generation`;
      return {
        ok: true,
        value: { assetId, generation: updated.ingest_generation },
      };
    });
  }

  /**
   * Makes the asset the product's thumbnail, if the product still shows the
   * image the asset was ingested from. A slower run for an older image URL
   * gets `url_changed` and writes nothing.
   */
  async attachThumbnail(
    productId: number,
    fence: Fence,
    sourceImageUrl: string,
  ): Promise<Fenced<null>> {
    return this.transaction("attachThumbnail", async (tx) => {
      const [product] = await tx.$queryRaw<{ image_url: string | null }[]>`
        SELECT image_url FROM product WHERE id = ${productId} FOR UPDATE`;
      if (!product) return { ok: false, reason: "missing" };
      if (product.image_url !== sourceImageUrl) {
        return { ok: false, reason: "url_changed" };
      }
      const outgoing = await tx.$queryRaw<{ asset_id: number }[]>`
        SELECT asset_id FROM product_asset
        WHERE product_id = ${productId} AND role = 'thumbnail'`;
      const ids = [
        ...new Set([fence.assetId, ...outgoing.map((r) => r.asset_id)]),
      ].sort((a, b) => a - b);
      let incoming: { row: LockedAsset } | { reason: FenceRejection } = {
        reason: "missing",
      };
      for (const id of ids) {
        if (id === fence.assetId) incoming = await this.checkFence(tx, fence);
        else await this.lockAsset(tx, id);
      }
      if ("reason" in incoming) return { ok: false, reason: incoming.reason };

      await tx.$executeRaw`
        DELETE FROM product_asset WHERE product_id = ${productId} AND role = 'thumbnail'`;
      await tx.$executeRaw`
        INSERT INTO product_asset (product_id, asset_id, role, position, source_image_url)
        VALUES (${productId}, ${fence.assetId}, 'thumbnail', 0, ${sourceImageUrl})`;
      return { ok: true, value: null };
    });
  }

  /**
   * For a product whose image was removed. The asset stays in the corpus.
   * A delayed run after the product got a new image does nothing.
   */
  async detachThumbnail(productId: number): Promise<Fenced<null>> {
    return this.transaction("detachThumbnail", async (tx) => {
      const [product] = await tx.$queryRaw<{ image_url: string | null }[]>`
        SELECT image_url FROM product WHERE id = ${productId} FOR UPDATE`;
      if (!product) return { ok: false, reason: "missing" };
      if (product.image_url !== null)
        return { ok: false, reason: "url_changed" };
      await tx.$executeRaw`
        DELETE FROM product_asset WHERE product_id = ${productId} AND role = 'thumbnail'`;
      return { ok: true, value: null };
    });
  }

  /**
   * Claims blobs for deletion: unreferenced past the grace period, or stuck
   * in `deleting` from an earlier run. Delete each object at `storageKey`
   * ("not found" counts as done), then call `finishBlobDeletion`.
   */
  async claimBlobsForDeletion(limit = 100): Promise<BlobToDelete[]> {
    const candidates = await this.prisma.$queryRaw<
      { id: number; sha256: string }[]
    >`
      SELECT id, sha256 FROM blob
      WHERE (state = 'live' AND unreferenced_since < now() - ${GC_GRACE}::interval)
         OR (state = 'deleting' AND deleting_started_at < now() - ${GC_STUCK}::interval)
      ORDER BY id LIMIT ${limit}`;
    const claimed: BlobToDelete[] = [];
    for (const candidate of candidates) {
      const blob = await this.transaction("claimBlob", async (tx) => {
        await this.lockHashes(tx, [candidate.sha256]);
        const [row] = await tx.$queryRaw<{ id: number; storage_key: string }[]>`
          UPDATE blob SET state = 'deleting', deleting_started_at = now()
          WHERE id = ${candidate.id}
            AND NOT EXISTS (SELECT 1 FROM asset WHERE blob_id = ${candidate.id})
            AND ((state = 'live' AND unreferenced_since < now() - ${GC_GRACE}::interval)
              OR (state = 'deleting' AND deleting_started_at < now() - ${GC_STUCK}::interval))
          RETURNING id, storage_key`;
        return row;
      });
      if (blob) claimed.push({ blobId: blob.id, storageKey: blob.storage_key });
    }
    return claimed;
  }

  /** The object is gone: drop the row */
  async finishBlobDeletion(blobId: number): Promise<boolean> {
    const deleted = await this.prisma.$executeRaw`
      DELETE FROM blob WHERE id = ${blobId} AND state = 'deleting'
        AND NOT EXISTS (SELECT 1 FROM asset WHERE blob_id = ${blobId})`;
    return deleted > 0;
  }

  /** The asset search query, shared by searchAssets and explainAssetSearch */
  private assetSearch(
    embedding: readonly number[],
    options: AssetSearchOptions,
  ) {
    const vector = toVector(embedding);
    const limit = Math.max(1, Math.min(options.limit, 200));
    const efSearch = Math.max(limit, Math.min(options.efSearch ?? 200, 1000));
    const maxScanTuples = Math.max(1000, options.maxScanTuples ?? 20_000);
    const colors = options.colors?.length ? options.colors : null;
    const licenses = options.licenses?.length ? options.licenses : null;
    // SET LOCAL can't take parameters; the values are clamped integers
    const settings = [
      `SET LOCAL hnsw.ef_search = ${efSearch}`,
      `SET LOCAL hnsw.max_scan_tuples = ${maxScanTuples}`,
      "SET LOCAL hnsw.iterative_scan = relaxed_order",
      ...(options.preferIndex
        ? ["seqscan", "bitmapscan", "sort"].map(
            (plan) => `SET LOCAL enable_${plan} = off`,
          )
        : []),
    ];
    const query = Prisma.sql`
      SELECT asset_id, generation, similarity, storage_key FROM (
        SELECT a.id AS asset_id, e.ingest_generation AS generation,
          1 - (e.embedding <=> ${vector}::halfvec(768)) AS similarity,
          b.storage_key
        FROM asset_embedding e
        JOIN asset a ON a.id = e.asset_id
        JOIN blob b ON b.id = a.blob_id
        WHERE e.profile_id = ${options.profileId}
          AND e.ingest_generation = a.ingest_generation
          AND a.status = 'embedded' AND a.deleted_at IS NULL
          AND (${colors}::text[] IS NULL OR b.colors && ${colors}::text[])
          AND (${licenses}::text[] IS NULL OR a.license = ANY(${licenses}::text[]))
        ORDER BY e.embedding <=> ${vector}::halfvec(768)
        LIMIT ${limit}
      ) candidates
      ORDER BY similarity DESC, asset_id`;
    return { limit, settings, query };
  }

  /**
   * Nearest assets over the whole corpus (HNSW). Relaxed-order iterative
   * scans keep going past filtered-out rows, but don't return rows in exact
   * order, so an outer query re-sorts them. On a small corpus the planner may
   * prefer an exact scan, which is also correct.
   */
  async searchAssets(
    embedding: readonly number[],
    options: AssetSearchOptions,
  ): Promise<{ hits: AssetHit[]; partial: boolean }> {
    const { limit, settings, query } = this.assetSearch(embedding, options);
    const minSimilarity = options.minSimilarity ?? -1;
    const rows = await this.prisma.$transaction(async (tx) => {
      for (const setting of settings) await tx.$executeRawUnsafe(setting);
      return tx.$queryRaw<
        {
          asset_id: number;
          generation: number;
          similarity: number;
          storage_key: string;
        }[]
      >(query);
    });

    return {
      // Below the threshold after the nearest ones: nothing further can pass
      hits: rows
        .filter((row) => row.similarity >= minSimilarity)
        .map((row) => ({
          assetId: row.asset_id,
          generation: row.generation,
          similarity: row.similarity,
          storageKey: row.storage_key,
        })),
      // The scan budget ran out, or fewer eligible assets exist than asked for
      partial: rows.length < limit,
    };
  }

  /**
   * The plan of an asset search, for the debug panel and tests.
   * `preferIndex` discourages the other plans, to show whether the query
   * can use the HNSW index at all.
   */
  async explainAssetSearch(
    embedding: readonly number[],
    options: AssetSearchOptions,
  ): Promise<string> {
    const { settings, query } = this.assetSearch(embedding, options);
    return this.prisma.$transaction(async (tx) => {
      for (const setting of settings) await tx.$executeRawUnsafe(setting);
      const rows = await tx.$queryRaw<{ "QUERY PLAN": string }[]>(
        Prisma.sql`EXPLAIN ${query}`,
      );
      return rows.map((row) => row["QUERY PLAN"]).join("\n");
    });
  }

  /**
   * Products ranked by their best linked image, exact (no index). Linked
   * assets are a small share of the corpus, too sparse for HNSW to traverse
   * well. Only links whose product still shows the ingested image count.
   */
  async searchProductsByVector(
    embedding: readonly number[],
    options: SearchFilters & { profileId: number; limit?: number },
  ): Promise<ProductVectorHit[]> {
    const vector = toVector(embedding);
    const limit = Math.max(1, Math.min(options.limit ?? 200, 200));
    const colors = options.colors?.length ? options.colors : null;
    const licenses = options.licenses?.length ? options.licenses : null;
    const categories = options.categories?.length ? options.categories : null;
    const minSimilarity = options.minSimilarity ?? -1;

    const rows = await this.prisma.$queryRaw<
      {
        product_id: number;
        asset_id: number;
        generation: number;
        similarity: number;
        storage_key: string;
      }[]
    >`
      SELECT product_id, asset_id, generation, similarity, storage_key FROM (
        SELECT DISTINCT ON (p.id) p.id AS product_id, a.id AS asset_id,
          e.ingest_generation AS generation,
          1 - (e.embedding <=> ${vector}::halfvec(768)) AS similarity,
          b.storage_key
        FROM product p
        JOIN product_asset pa ON pa.product_id = p.id
        JOIN asset a ON a.id = pa.asset_id
        JOIN asset_embedding e ON e.asset_id = a.id AND e.profile_id = ${options.profileId}
        JOIN blob b ON b.id = a.blob_id
        WHERE p.status = 'Available'
          AND pa.role = 'thumbnail' AND pa.source_image_url = p.image_url
          AND e.ingest_generation = a.ingest_generation
          AND a.status = 'embedded' AND a.deleted_at IS NULL
          AND (${categories}::text[] IS NULL OR p.category = ANY(${categories}::text[]))
          AND (${licenses}::text[] IS NULL OR p.license = ANY(${licenses}::text[]))
          AND (${colors}::text[] IS NULL OR b.colors && ${colors}::text[])
        ORDER BY p.id, e.embedding <=> ${vector}::halfvec(768)
      ) best
      WHERE similarity >= ${minSimilarity}
      ORDER BY similarity DESC, product_id
      LIMIT ${limit}`;

    return rows.map((row) => ({
      productId: row.product_id,
      assetId: row.asset_id,
      generation: row.generation,
      similarity: row.similarity,
      storageKey: row.storage_key,
    }));
  }

  /** Products whose name or description is closest to the text (trigram KNN) */
  async searchProductsByText(
    text: string,
    options: Omit<SearchFilters, "minSimilarity"> & { limit?: number } = {},
  ): Promise<ProductLexicalHit[]> {
    const limit = Math.max(1, Math.min(options.limit ?? 200, 200));
    const colors = options.colors?.length ? options.colors : null;
    const licenses = options.licenses?.length ? options.licenses : null;
    const categories = options.categories?.length ? options.categories : null;

    const rows = await this.prisma.$queryRaw<
      { product_id: number; trigram: number }[]
    >`
      SELECT p.id AS product_id, 1 - (p.search_text <-> ${text}) AS trigram
      FROM product p
      WHERE p.status = 'Available'
        AND (${categories}::text[] IS NULL OR p.category = ANY(${categories}::text[]))
        AND (${licenses}::text[] IS NULL OR p.license = ANY(${licenses}::text[]))
        AND (${colors}::text[] IS NULL OR EXISTS (
          SELECT 1 FROM product_asset pa
          JOIN asset a ON a.id = pa.asset_id
          JOIN blob b ON b.id = a.blob_id
          WHERE pa.product_id = p.id AND pa.role = 'thumbnail'
            AND pa.source_image_url = p.image_url
            AND a.deleted_at IS NULL AND b.colors && ${colors}::text[]))
      ORDER BY p.search_text <-> ${text}, p.id
      LIMIT ${limit}`;

    return rows.map((row) => ({
      productId: row.product_id,
      trigram: row.trigram,
    }));
  }
}
