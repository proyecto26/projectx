# Visual search: design

Status: in progress. Progress is tracked in the checklist at the end. Supersedes the CLIP / Wolt approach in [IMAGE_SEARCH.md](IMAGE_SEARCH.md) and [VECTOR_SEARCH_CONF.md](VECTOR_SEARCH_CONF.md).

## Review of the old example (snappr/projectx-search)

Exists: `tools/data_ingest/ingest.py` (Wolt CLIP dataset -> MinIO + COPY into `image`), `Dockerfile.postgres` (pgvector 0.8.0 from source), init SQL with postgis/pg_trgm/vector. `apps/search` is a stub. Not ported as is:
1. `minio/minio:latest` can no longer be pulled (MinIO CE archived Feb 2026). Replaced by RustFS 1.0.5, local only.
2. `minio-setup` hardcodes `minioadmin`, uses deprecated `mc config host add` / `mc policy set`, and makes the whole bucket public.
3. pgvector built from source; the PGDG package `postgresql-17-pgvector` is enough.
4. ingest.py is not idempotent or resumable, drops failures, stores everything as `image/jpeg`, disables TLS checks, writes vectors as JSON text.
5. Wolt vectors are CLIP ViT-B/32 (512-d); every image has to be re-embedded with the query model.
6. `image` table: no unique external id, no ANN index, no model/version, no hash, no product link, no status.
7. Search as a workflow adds latency to the KPI path. Search is a plain request; workflows only for ingestion, deletion, batch indexing and reconciliation.

## Decisions (user, 2026-11-13)
- Images: thumbnails of the three HF 3D datasets the catalog uses (whole datasets, CC0 / CC BY), a ~100k top-up with an open product-photo dataset is deferred.
- S3: RustFS pinned (MinIO images unavailable), local dev only; code uses plain S3 (AWS SDK v3 / boto3), swappable by config.
- Order: after the 3D catalog (PR #34), one step at a time, each reviewed before the next.

## Schema (authoritative; migrations follow this section only)

| Table | Columns | Keys and indexes |
|---|---|---|
| `embedding_profile` | id, model, model_revision (HF commit), dims (768 in v1), dtype (`q4`), runtime (`transformers.js@<version>`), document_template (`image` in v1), query_prompt, image_token_budget, created_at | unique (model, model_revision, dims, dtype, runtime, document_template); settings can't change in place (a conflicting registration is an error); v1 holds a single row; the table exists so stored vectors record what produced them |
| `asset` | id, source, external_id, sha256, storage_key `assets/<asset id>-<generation>-<sha256>.<ext>` (unique; both **nullable** until published), content_type, bytes, width, height, colors text[], origin_url (nullable; set for URL and dataset ingestion), staging_key (nullable; set for uploads and during staging), ingest_generation int, admission_key (the idempotency key of the admission that started the current generation), attempts, next_attempt_at, deleted_at (tombstone), content_revision, replaced_from_generation (the generation a content replacement started from), stored_at (when the current generation's bytes were stored; kept when a later step fails), error_code (closed set), see [EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md), source_url, license, credit, name, description, tags, metadata jsonb, status `admitted / stored / embedded / failed`, error, created_at, updated_at | unique (source, external_id); unique storage_key; GIN on colors |
| `asset_dispatch` | asset_id (FK asset, cascade), ingest_generation, dispatch_id varchar(128), created_at | PK (asset_id, ingest_generation, dispatch_id); one row per counted dispatch, deleted when the generation changes (see EMBEDDINGS_SERVICE.md, Failures) |
| `asset_embedding` | asset_id (FK asset, cascade), profile_id (FK), input_revision, ingest_generation, embedding `halfvec(768)`, created_at | PK (asset_id, profile_id); HNSW `halfvec_cosine_ops` |
| `product_asset` | product_id (FK product), asset_id (FK asset, cascade), role `thumbnail / gallery`, position, source_image_url (the product URL this link was ingested from) | PK (product_id, asset_id, role); partial unique (product_id) where role = `thumbnail` |
| `search_session` | id (uuid), profile_id, mode `vector / hybrid / lexical`, query_hash, results jsonb (ranked `[product_id, asset_id, ingest_generation, score]`, at most 200), partial, created_at, expires_at | index on expires_at (cleanup) |
| `query_upload` | key, created_at, expires_at | index on expires_at |
| `search_state` | key, value jsonb, updated_at | PK key (reconcile watermark) |
| `product` (existing) | + `search_text` text kept by a `BEFORE INSERT OR UPDATE` trigger (`name || ' ' || coalesce(description, '')`; Prisma 7 can't model a generated column without drift) | GiST `gist_trgm_ops` on search_text (supports `<->` KNN ordering; GIN only supports filtering) |
| `asset` (repair) | + attempts, next_attempt_at | index on (status, next_attempt_at) |

Status meanings: asset `admitted` (row created before anything is downloaded or hashed; `storage_key` null until publication; `origin_url` and/or `staging_key` say where the bytes come from), `stored` (key published, object written and validated), `embedded` (current embedding for every maintained profile), `failed` (error set, `storage_key` may be null; retried by `repairAssets`). Every entry point (upload, URL, dataset batch, reconcile) starts by upserting the `admitted` row: an upload first writes its bytes to `staging/<uuid>` and records `staging_key`; URL and dataset rows record `origin_url`. Repair resumes from whichever reference is present. Staging objects are deleted only after publication commits (the copy to `assets/` exists) or after a terminal validation failure (not an image, too large, undecodable); transient failures keep them. The staging retention backstop (7 days) is longer than the repair window (5 attempts with exponential backoff, under 24 h), and repair marks an upload `failed` with `staging_expired` if its staging object is gone.

Asset fencing: admission increments `ingest_generation` (`UPDATE ... RETURNING`), and that number is an input to every later step: publication, status changes, embedding upserts (`asset_embedding.ingest_generation` is written too), product link attachment, and deletion. Each runs in one transaction that starts with `SELECT ingest_generation, deleted_at FROM asset WHERE id = $id FOR UPDATE`, checks `ingest_generation = $expected AND deleted_at IS NULL`, and only then writes the asset or its child rows (`asset_embedding`, `product_asset`). Admission and deletion take the same row lock before changing the generation, so no write can interleave with them: an embedding computed for generation 1 can't overwrite a generation 2 embedding or recreate one after deletion. Obsolete work finds a mismatch, writes nothing and stops. Lock order everywhere: product row, then asset rows in ascending id. Product deletion (existing code) cascades to `product_asset` only; it takes no asset lock, and asset deletion takes no product lock, so the two can only wait on the same `product_asset` row, never in a cycle. All search-side write transactions retry on deadlock (`40P01`) and serialization failures (`40001`) up to 3 times with jitter; the SQLSTATE is read from the driver error Prisma wraps (`P2010` outside, the original code inside). Integration tests run the interleavings against PostgreSQL with two connections, including product deletion vs asset deletion and product deletion vs thumbnail attachment, and: admission vs embedding write, deletion vs embedding write, deletion vs link attachment, re-admission vs delayed delete. Deletion takes the expected generation as well, so a delayed delete can't tombstone an asset that was re-admitted after it was requested; in one transaction (asset row locked) it sets `deleted_at`, increments the generation, deletes product links and embeddings, and clears the content columns (`storage_key` included), so the old object becomes an orphan for the sweep. Deletion is permanent until an explicit restore: tombstones are kept (they are the suppression record). Reconcile, repair and batch ingestion never admit an asset whose (source, external_id) has a tombstone; reconcile counts such product links in a `suppressed` metric instead. A different source URL is a different external_id and is admitted normally. Restore is a separate API call (`POST /search/assets/:id/restore`, admin only) that clears `deleted_at` and admits a new generation, which re-fetches the bytes from `origin_url`; it is the only path that clears a tombstone. Uploads have no origin and their staging copy is gone after deletion, so they can't be restored (`409 { code: "NO_SOURCE" }`): the user uploads again.

Content replacement is a new generation: publishing a different hash for an asset that already had published content increments `ingest_generation` and `content_revision`, records `replaced_from_generation`, deletes the embeddings, sets status `admitted` and schedules repair (`next_attempt_at`), all in the same locked transaction; `publishObject` returns the key and the generation to continue with. A retry of that same publication (same bytes, from the generation the replacement started from, its result lost in a crash) gets the same result back instead of `stale`; anything else holding the old generation is fenced out, and search sessions detect the replacement through the stored `ingest_generation`. `markStored` and `writeEmbedding` take the `storage_key` the worker processed (it names one set of bytes, so it is the content identity) and reject `content_changed` otherwise; `markStored` is idempotent; `markFailed` takes the `storage_key` the attempt was about (null before publication) and changes nothing once the bytes of the current generation were stored (`stored_at`, which a failed status doesn't erase; pre-publication failures) or the asset is embedded.

Repair invariant: every live asset that isn't `embedded` has `next_attempt_at` set, unless its last failure was terminal (not retryable, or attempts exhausted) and nothing succeeded after it. Admission, restore and content replacement set it (+15 min); `markStored` resets it (+15 min) because stored bytes still need an embedding, whatever a retryable overlapping failure set before; `markFailed` sets the backoff or clears it for terminal failures; only `writeEmbedding` clears it on success; deletion makes the asset not live. A terminal failure after storage is the exception: nothing but success, a new generation or an admin retry changes it (precedence and attempt accounting: [EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md), Failures).

Serving rule: admission of a new generation deletes the asset's existing `asset_embedding` rows and sets status `admitted` in the same locked transaction, so an old vector can never be served with new content; the asset is unsearchable until the new embedding is written. Every search query also requires `asset_embedding.ingest_generation = asset.ingest_generation AND asset.status = 'embedded' AND asset.deleted_at IS NULL` (defence in depth; covered by a test that corrupts the generation on purpose).

`product_asset.product_id` is `ON DELETE CASCADE`, so search links never block product deletion. When a product's `imageUrl` becomes null, reconcile removes its thumbnail link (the asset stays in the corpus); the detach locks the product row and does nothing if the product has an image again. Every read of "the product's current thumbnail" uses one predicate: `role = 'thumbnail' AND source_image_url = product.image_url`. Bytes changing behind an unchanged URL are caught by the nightly full reconcile: it re-fetches with `If-None-Match` / `If-Modified-Since` and, when the content differs, re-admits the asset (new generation, content replacement as below).

## Model and embedding profiles

`google/embeddinggemma-2` (Apache-2.0). One 768-d space for text, images and mixed text+image; MRL truncation to 512/256 then re-normalize. Text queries use `prompt_name="SearchQuery"`, images no prefix.

v1 scope:
- The first active profile is image-only (`document_template = image`). Product text is not baked into vectors; it is matched live at query time (see Search). Editing a product's text needs no re-embedding. Mixed document profiles are a later change (they need product-change triggers and a rule for assets shared by several products).
- One profile in v1: canonical 768-d, model pinned to one HF revision. Every stored vector references it, every query uses it. MRL dimension changes, other model revisions, dual-writes and rollback are a separate change ("embedding profile lifecycle") with its own review; the schema already records the profile per vector, so that change starts without migrating existing rows.
- Maintained profiles predicate (used by ingestion, repair and the `stale_embeddings` metric): in v1, the single profile. The later change replaces this one function.

## Content, source and product identity

- Each `asset` owns its object: the same bytes from two sources are two assets and two objects, each with its own attribution. Embeddings are per asset anyway, so sharing objects would only save storage, which is negligible at this scale; a shared, reference-counted blob layer was dropped before release for its locking and GC cost (decision reviewed 2026-11-15). Only images are ingested and embedded; GLB/STL files stay on HF (`product.modelUrl` / `downloadUrls`) and are not stored or indexed (rendering GLB views is a later change).
- No S3 call happens inside a database transaction.
  - Publish (asset row locked, generation checked): same hash as the current content -> keep its key; otherwise record sha256, the new key `assets/<asset id>-<generation>-<sha256>.<ext>` and the metadata on the asset -> commit (the key is now referenced, before the object exists) -> put the object at that key (idempotent, same bytes) -> asset `stored`. Different bytes than the asset already had start a new generation (Content replacement), so the key changes too.
  - Keys are never reused: a key names one generation, and generations only grow, so once an asset leaves a key (replacement, deletion) nothing references it again.
  - Delete asset: as defined under Asset fencing (tombstone, clear the content). No object deletes here.
  - Cleanup is one mechanism, the orphan sweep (scheduled, in the search service): list `assets/` page by page, ask the database which keys no asset holds in any status (`unreferencedObjects`, a fresh read after listing), and delete those whose object is older than 1 day ("not found" counts as done; a database error deletes nothing). The day bounds the publish activity (its timeout and retries are far shorter), so a key reserved by an in-flight publish is always referenced by the time its object is old enough. A replaced or deleted object can go on the next sweep: a results page already rendered may lose that thumbnail, which is accepted (no retention period after retirement is promised).
  - Why no cleanup ledger or per-delete workflow: with never-reused keys, the sweep alone guarantees that no referenced object is deleted and that every orphan (including a late write after cleanup) is eventually removed. A transactional outbox would only add a retention period after retirement, and Temporal timers would still need the sweep as a backstop and can't protect an object from it (reviewed 2026-11-15).

## Storage

- Prefixes: `staging/<uuid>` (private; app deletes on publish or terminal failure, 7-day lifecycle rule as backstop), `assets/<sha256>-<generation>.<ext>` (anonymous read). Uploads and URL downloads go to staging; validation (type sniffing, size, decode) and hashing happen there; publish = server-side copy to `assets/`, then delete staging. Terminal validation failures delete the staging object; transient failures keep it for repair.
- Query images (search by image) are temporary and never indexed: stored under `query/`, tracked in a `query_upload` row (key, expires_at = now + 1 h). Requests check `expires_at` before using one; a scheduled cleanup every 10 minutes deletes expired objects and rows. Store lifecycle rules (days) on `query/` and `staging/` are only a backstop, so retention doesn't depend on the store. "Add to dataset" is a separate, explicit action that runs ingestion.
- Env: `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (compose refuses to start without the credentials, so RustFS never falls back to its default ones). `storage-setup` (AWS CLI) creates the bucket, a bucket policy with anonymous `s3:GetObject` on `assets/*` only, and lifecycle rules: `staging/` 7 days, `query/` 1 day. Verified: `assets/` 200 anonymously, `staging/` and `query/` 403, setup idempotent.

## Temporal payload boundaries

Nothing large crosses Temporal. Workflow and activity inputs/outputs carry ids and keys only:
- Batch child workflow input: up to 500 asset ids (~4 KB). Activities: `stageAndHash({ assetId, generation })` (TS, returns sha + key), `embedAssets({ items: [{ assetId, generation }], profileId })` (task queue `embeddings-bulk`; single-asset ingestion uses `embeddings-interactive`). These two queue names are the only ones; both are served by the `embed-image` process.
- The embedding activity (contract in [EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md)) reads objects from S3 outside the inference permit, embeds one item per permit grant (CPU inference gains nothing from microbatches and a single item bounds a query's wait), writes vectors straight into `asset_embedding`, heartbeats, and returns `{ embedded, failed: [{ assetId, code, retryable }], skipped }` read from the database. Vectors never enter workflow history.
- Limit enforced in code: activity results under 256 KB (well below the 2 MiB payload limit), asserted in tests. A test runs the real batch workflow against the real `embed-image` workers (fake embedder) with a batch of 500.
- Parent: pages the source (cursor in workflow state), starts children with bounded parallelism (e.g. 4), continue-as-new every N pages; progress via a query.

## Inference capacity

The model runs in TypeScript with `@huggingface/transformers` (ONNX, CPU); no Python. Decision, measurements and gates: [EMBEDDINGS_RUNTIME.md](EMBEDDINGS_RUNTIME.md). Two processes from one NestJS image:

- `embed-text`: text-only session, 2 threads, `POST /embed/text` for text queries. Nothing else runs there, so text latency doesn't depend on image work (measured p95 133 ms with image inference saturating 4 threads on the dev laptop; 83 ms with 2).
- `embed-image`: vision + text session, 4 threads, one inference at a time under a priority permit: image and mixed queries (`POST /embed/image`) > `embeddings-interactive` > `embeddings-bulk`, granted per item, starvation-bounded, cancellable, with heartbeats while waiting. Two activity-only `@temporalio/worker` workers in the process.

Gate: text query p95 under 150 ms end to end with ingestion running, re-measured on the deploy target. Fallback: fewer image threads, then bulk ingestion only in `BULK_INGESTION_WINDOW`; the one-minute indexing promise then holds for interactive ingestion only. Image queries take ~7–12 s on CPU (a loading state in the UI, 20 s timeout). One image lane embeds ~0.17–0.35 images/s, so the 100k backfill (deferred) is a long, resumable background job.

Degraded modes, explicit in the response (`mode`, `degraded`):
- Text-only or mixed query and `embed-text` / `embed-image` unavailable: lexical-only ranking (lexical branch alone), `mode: lexical`, `degraded: true`. The session stores that ranking, so later pages stay consistent; a new search tries inference again.
- Image-only query and `embed-image` unavailable: `503 { code: "SEARCH_UNAVAILABLE" }`; the UI says image search is unavailable and does not show unrelated browsing.

## Database image and rollout

- `docker/postgres/Dockerfile`: `FROM postgis/postgis:17-3.6`, `apt-get install postgresql-17-pgvector=0.8.7-1.pgdg13+2` (iterative scans need >= 0.8.0; the base image is amd64 only, compose pins `platform`). Same Postgres major (17), so the existing `postgres_data` volume is reused. Upgrading an existing checkout: (1) copy the `OBJECT STORAGE SETTINGS` block from `.env.example` into `.env` (compose refuses to resolve any service without the S3 credentials); (2) `docker compose build db && docker compose up -d db storage storage-setup`; (3) apply the migration through the migration owner, `docker compose up builder` (or `pnpm prisma:migrate` from the host with `POSTGRES_HOST=localhost`). Restarting `db` alone installs the extension binaries but does not create the extensions.
- Extensions move into migrations: `CREATE EXTENSION IF NOT EXISTS vector` and `pg_trgm` in a migration, `extensions = [postgis, pg_trgm, vector]` in the schema (removes the current pg_trgm drift). The init SQL stays only for fresh volumes.
- CI: the `database` job builds the image with a plain `docker build` (no layer cache: it is one apt install on top of a pulled base, about half a minute, and an uncached build also catches a pinned package that left the repository) and starts it with `docker run` + a TCP health wait instead of `services:` (services can't build). `prisma migrate deploy` then creates the extensions.

## Search queries

Candidates are retrieved independently, then merged:
Product search scope: the ANN index covers the whole corpus (~100k), while products link to a few hundred or thousand assets, too sparse for HNSW to traverse well. Product search therefore uses an exact scan over linked assets (`asset_embedding` joined through `product_asset` to eligible products, `profile_id = $active`) while that set is under 20k rows (milliseconds at this size). Above that (a later change), linked embeddings get their own projection table with its own HNSW index, maintained in the same transactions as `product_asset` (including cascades); v1 doesn't need it. Step 2 benchmarks the exact path with realistic ratios (100k corpus, 120 to 5k linked). Asset search over the whole corpus uses the full HNSW index.

Eligibility (product `status = 'Available'`, category, license, colors, `min_similarity` where it applies to one branch) is part of each candidate query, never applied after a limit, so limits and expansion only count eligible products.
- Vector candidates (product search): exact cosine over the active profile's embeddings of linked assets joined to eligible products, grouped by product (best score), top 200. No HNSW and no scan budget on this path, so nothing is partial.
- Vector candidates (asset search over the whole corpus): HNSW with `SET LOCAL hnsw.ef_search` (default 200: on the 2,000-asset fixture recall@10 is 0.91 at 100, 0.99 at 200, 1.0 at 400, filtered or not), `hnsw.iterative_scan = relaxed_order`, bounded `hnsw.max_scan_tuples`, filters inside the query, exact re-ordering in an outer query (relaxed order isn't strict), `partial: true` when this path returns fewer rows than requested. That is conservative: it covers the scan budget running out and also a filter that matches fewer assets than requested (Postgres doesn't report which one happened), so the UI says "results may be incomplete", not "search failed". Exact paths (product search) never set it; indexing progress is reported separately in `coverage`.
- Lexical candidates (when there is text), one branch: full-text first, trigram only as its fallback (decided 2026-11-16 with Codex, approve_with_changes 0.95). Full text: `product.search_document`, a weighted `tsvector` (name A, description B) under one `simple` + `unaccent` text search configuration used for both documents and queries (`websearch_to_tsquery`), GIN index; eligible matches ordered by `ts_rank_cd` descending, then product id, top 200. Only when there are zero eligible full-text matches (including a query whose tsquery parses to nothing, e.g. a typo or only stop characters) the branch uses the trigram KNN on `search_text` (GiST, `ORDER BY search_text <-> $q`, similarity > 0 only), top 200. Trigram never fills up a non-empty full-text list. Its latency at the corpus size is part of KPI 1.
- A product without a current thumbnail embedding can still come from the lexical branch (the exclusion rule applies to the vector branch only), so both branches share one eligibility definition: available product + filters, applied inside each branch before its limit.
- `min_similarity` is a cosine threshold of the vector branch only, applied before its limit; it never rejects a lexical hit.
- Modes: text only → vector branch on the text embedding + lexical branch; text + image → vector branch on the mixed embedding + lexical branch; image only → vector branch only. If inference fails with text present, the response is lexical-only with `degraded: true`; image only with inference down answers `503`.
- Merge: Reciprocal Rank Fusion, unweighted, `k = 60`: each branch gives its candidates unique 1-based ranks (ties broken by product id), `score = 1/(60 + vectorRank) + 1/(60 + lexicalRank)`, an absent branch contributes 0; sort by score descending, then product id; keep at most 200. No per-request weight (`w` is removed). Ranks are scale-free, so cosine, `ts_rank_cd` and trigram never have to be calibrated against each other; relevance tuning (stemming configs, branch weights) waits for the labelled set (step 7).
- Each result carries the fused score, its cosine and lexical score (each nullable), the lexical source (`fts` / `trigram`) and its branch ranks (nullable); the search session stores them with the result, so later pages show the scores of the original ranking.
- Validation: an exact oracle scans every eligible product, computes both branch scores exactly, applies the same fallback, threshold, tie-breaks and 200-row branch cutoffs, then the same RRF; the repository result must equal it (order and score breakdown). Untruncated full-catalog RRF is reported separately as a diagnostic of the cutoff effect; neither measures human relevance (KPI 2 does). Filtered recall@10 of the vector step against exact search stays as before.

## Product search contract (marketplace)

- Ownership: a new `apps/search` (NestJS) owns asset/asset_embedding/profile and the S3 bucket. The product service stays the source of truth for products, prices and availability.
- `POST /search/products` (body: `q`, `imageKey`, filters, `limit`, `cursor`) returns a new `ProductSearchResponseDto`: `products`, `scores`, `cursor` (opaque, HMAC-signed: search session id + offset), `totalEstimate`, `totalIsCapped`, `mode`, `degraded`, `partial`, `timings`. It does not reuse `ProductListResponseDto`, whose `total` is exact.
- Pagination reads from a search session: the first request computes the full ranked list (at most 200 products) once and stores it in `search_session` (TTL 15 min); later pages slice that stored list, so ranking never changes between pages and nothing is skipped or duplicated, whatever happens to inference in between. An expired session returns `410 { code: "SEARCH_EXPIRED" }` and the UI re-runs the search. Each page revalidates its slice in one query: a result is kept only if the asset still has the stored `ingest_generation`, is `embedded` and not deleted, is still the product's thumbnail, and the product is still available (lexical-only results check only the product). Dropped results are counted in `removedSinceSearch`; the order of the remaining ones is unchanged, so a stale score is never shown next to new content. Product rows (price, availability) are read fresh for each page.
- Search results use "load more" (cursor) in the UI; numbered pages with an exact total stay for plain browsing on `/product`. It searches only assets linked through `product_asset` (see Search queries). `totalEstimate` is the session's list length, capped at 200 with `totalIsCapped`.
- The marketplace loader and a new `useProductSearch` hook use it when `q` or an image is present; `useProducts` and `/product` stay for plain browsing.
- Indexing lifecycle, owned by `apps/search`, with no calls from the product service or the seed: `seedCatalog` stays database-only (no Temporal dependency; the db integration tests keep running without it). A Temporal schedule runs `reconcileProductAssets` every minute: it reads products with `updated_at >= watermark - 5 min` (overlap, idempotent), compares `imageUrl` with the thumbnail link's `source_image_url`, and ingests what changed. Attaching is guarded, with a fixed lock order (product row, then the incoming and outgoing asset rows in ascending id): in one transaction, `SELECT ... FOR UPDATE` the product, check that its current `imageUrl` still equals the URL that was ingested, then replace the thumbnail link (one per product, enforced by the partial unique index); if the URL changed meanwhile, the stale result is dropped and the newer run attaches its own. It then then advances the watermark stored in a `search_state` row. A nightly full reconcile (no watermark) catches anything missed. `pnpm search:reconcile` runs the same workflow on demand. New or edited products become searchable within about a minute. Availability is never copied into the index; it is joined at query time. Startup (owner decision 2026-11-16, YAGNI/KISS for the MVP): one `search` process runs HTTP and its Temporal worker and depends on `db`, `embed-text`, `temporal` and `storage-setup`; it reports ready only after its Temporal client and worker are ready, has a compose restart policy (`unless-stopped`) and shuts down gracefully, and registers its schedules idempotently, so a restarted or new instance resumes the work (Temporal keeps the workflow state). While Temporal is down, search is down too; that is accepted. Search adds no new dependency to browsing or orders: if the search service or its embedding process is down, `/product` browsing and checkout keep working (orders already depend on Temporal; a Temporal outage affects them regardless of search). Search's dependencies stay confined to it: nothing is added to `builder`, the shared health check, product, order or the plain marketplace loader, and step 5 verifies browsing and checkout with search stopped.
- General asset search (`GET /search/assets`), scrape and upload work on the whole corpus, including assets with no product.
- Repair for the whole corpus (linked or not): a scheduled `repairAssets` workflow every 5 minutes picks assets in `admitted` / `stored` / `failed` whose `next_attempt_at` has passed (an `admitted` or `stored` asset gets `next_attempt_at` set when its workflow starts, so a crashed run is picked up later) (exponential backoff, `attempts` capped at 5, then left `failed` and reported), and assets missing a current embedding for the maintained profiles, and re-runs the matching ingestion steps. This is also how `stale_embeddings` drops back to zero.

## Flows

1. Search API: text, image upload, image URL, text+image (one mixed embedding), product page URL; filters (min similarity, colors, tags, source, license); timings (embed ms, query ms) and distances for the debug panel.
2. Scrape: fetch with an SSRF guard (resolve and block private, loopback and link-local addresses, including after redirects; size and time limits; content-type sniffing). Main image: JSON-LD `Product.image` > `og:image` > `twitter:image` > largest `<img>` by declared size. Plain HTTP + cheerio; no bot-protection evasion: a blocked page counts as a scrape failure (KPI 3).
3. Ingest one asset (workflow): stage -> validate/hash -> colors/size -> publish object -> embed (`embed-image`) -> status embedded.
4. Delete asset (workflow), as described under Identity.
5. Batch index (workflow), as described under payload boundaries. HNSW index built after the first bulk load of a profile.

## Lessons from Gallery's Instant Media Search

Google AI Edge Gallery ships the same model (EmbeddingGemma 2) for on-device photo search (`customtasks/smartalbum`, `services/semanticretrieval`, reviewed 2026-11-14). What it confirms and what we take:

- Confirms: image-only documents (name and location are stored next to the vector, never embedded), normalized 768-d vectors, incremental indexing by comparing source ids with indexed ids, inference paused for interactive work (it pauses while the user scrolls; we use the priority permit).
- Image token budget: it embeds photos with 70 vision tokens (input limit 256), video windows also with 70; the model's defaults are 280 for images and 140 for video. Our pinned transformers.js reads `max_soft_tokens` in `Gemma4ImageProcessor`, resizes each image to fit `tokens x 9` patches of 16 px (about 800x800 px at 280, 400x400 px at 70), and expands the image placeholder from each image's actual token count, so the budget is a processor setting. Gallery keeps a separate compiled-model cache per budget; for us the budget is part of the embedding profile (`imageTokenBudget`), so two budgets never share a profile. Spike 3.1b kept 280: 70 is 4.9x faster but loses about 0.035 nDCG@10 on image-to-image queries (text queries within noise).
- Find similar: Gallery re-embeds the photo. For an indexed asset we query with its stored `asset_embedding` (no inference, no permit); only uploaded or scraped images use the image lane. Goes into the step 5 design.
- Search as you type (step 6): 300 ms debounce, abort the previous request (the query lane honours the abort signal), keep the previous results on screen dimmed until the new ones arrive, grey out results below `max(0.40, top - 0.20)` as a display hint, computed on the result's cosine (a lexical-only result has none and is not greyed out), never on the RRF score, which stays below ~0.033 (the API's `min_similarity` stays the filter).
- Index coverage: the search response gets `coverage: { embedded, pending }` for the searched scope so the UI can say results may be incomplete while indexing runs (`partial` stays about the HNSW scan budget). Goes into the step 5 design.
- Not taken: one fused vector per multi-image record (we keep one vector per image and score a product by its best image, so a query can match one view and links never force a re-embed); brute-force SQLite search (we are at ~100k assets); retry-on-next-run failures (we keep the repair workflow).

## Steps (each one reviewed before the next)
1. Infra (done): `docker/postgres/Dockerfile` (PostGIS 17-3.6 + `postgresql-17-pgvector=0.8.7-1.pgdg13+2`), compose `db` built from it on the existing volume, `storage` (RustFS) + `storage-setup`, migration `20261113000000_search_extensions` (pg_trgm, vector) with `extensions = [postgis, pg_trgm, vector]`, CI `database` job builds and runs the same image, `pg_isready -h 127.0.0.1` healthchecks (the socket check passed against the init-time server), S3 env vars in `.env.example`, integration tests for the extensions (halfvec, HNSW, iterative scan, trigram).
   Service topology moves to the steps that create each app, so compose never references a missing app: `embed-text` and `embed-image` (NestJS, root Dockerfile, `/health` ready after the model loads, `MODEL_CACHE_DIR` volume, read-only, memory limits 1.5 GB / 2.5 GB, ports 8085 / 8086) in step 3; `search` (NestJS, root Dockerfile, port 8084, `/search/health`, `pnpm dev:search`, its node_modules volumes and builder build filter) in step 4. `embed-image` and `search` depend on `db`, `storage-setup` (completed), `temporal`, and on `builder` with `condition: service_completed_successfully`; `embed-text` only on `model-fetch`, `db` and `builder` ([EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md), Compose): `builder` stays the single migration owner, so they never start against an old schema. Product, order and auth keep starting without them. Web `SEARCH_API_URL` (server only), the public search URL in `env.server.ts` / `app.config.server.ts`, and `S3_PUBLIC_URL` in the CSP `img-src` land in step 6 with the UI.
2. Schema and repository: all tables in the authoritative schema; asset search (HNSW + outer re-ordering) and product search (exact); integration tests: object keys (per generation, never reused, orphan detection), asset row-lock interleavings, filtered recall vs exact on fixtures, product search at realistic link ratios.
3. Embeddings (TypeScript, `@huggingface/transformers` pinned, model at a pinned HF revision, q4): spike done ([EMBEDDINGS_RUNTIME.md](EMBEDDINGS_RUNTIME.md)); `embed-text` and `embed-image` apps with the priority permit and activity-only workers; parity fixtures and loaded-latency gate; contract tests against `SearchRepositoryService`.
3b. Lexical relevance (before step 4, repository only): forward migration (`unaccent`, the `simple` + `unaccent` configuration, `product.search_document` maintained by extending the existing `search_text` trigger, backfill, GIN; the trigram index stays; the column declared in Prisma so product create/update keep working; checked on a fresh install and on an upgrade with data, followed by product edits); the lexical branch with its trigram fallback and RRF as specified under Search queries, with the exact oracle; `statement_timeout` on every search path and a per-process pool limit with a finite acquisition wait; benchmark with realistic names and descriptions at ~117, 5k and 20k products (100k assets), 200 candidates per branch, selective filters, common terms, typos and no-match queries, at a stated query rate and duration with timeouts and errors reported, while repository-level ingestion writes run (repeated end to end after step 5).
4. Workflows: ingest, delete, batch index, reconcile; Temporal tests + the batch-of-500 test with interactive work arriving mid-batch.
5. Search API + product search contract + scrape with SSRF tests.
6. UI: search bar with image upload and scrape mode, results grid, debug panel; marketplace uses the product search.
7. Corpus top-up to ~100k and KPI runs.

CI: everything is in the pnpm workspace, so the existing `verify` job lints, builds and unit-tests the embedding apps. Model weights are never downloaded in CI: inference is behind an `Embedder` interface with a deterministic fake. The `database` job (Postgres + RustFS) runs the activities against the real store with the fake embedder, and the batch-of-500 test uses the Temporal test environment. Tests with real weights (parity fixtures, loaded latency) are tagged and run manually and before activating a profile.

## Acceptance (dev hardware: Apple Silicon laptop, CPU only, 1 query at a time, ingestion optionally running)
- KPI 1, speed: asset search over the whole ~100k corpus, top-10 query step p95 < 50 ms with the active profile; product search measured separately at its real linked size; end-to-end text search p95 < 300 ms (embedding included); reported with and without ingestion running.
- KPI 2, accuracy: filtered recall@10 vs exact >= 0.95; nDCG@10 on the labelled set (~50 text, ~30 image queries) reported for the 768-d profile; the same harness is reused by the later profile-lifecycle change to compare truncated dimensions offline.
- Retrieval gate for the q4 profile (criteria fixed 2026-11-16, before the run): a fixed sample of 500 catalog images (manifest of ids and sha256, committed with the run) embedded with q4 and with the fp32 reference lock. Image to image: each sample image queries the other 499 (itself excluded), top-10 by cosine; overlap = |q4 top-10 ∩ fp32 top-10| / 10; pass if the mean is >= 0.9 and the 10th percentile >= 0.7. Text: the labelled text queries against the same 500, same overlap and thresholds. Relevance: nDCG@10 of q4 within 0.02 of fp32 for text and for image queries (paired over the same labelled queries, 95% bootstrap interval reported). Failing any of them blocks activation of the profile.
- KPI 3, scrape: >= 80% correct main image on a fixed list of ~30 public product pages.

## Still open
- Which open product-photo dataset fills the corpus to ~100k (pinned revision, license, metadata mapping). Steps 1-6 don't depend on it: the pipeline is source-agnostic and starts with the 3D datasets.

## Open items (resolve in the step 4-5 designs, before their code)
1. Admission idempotency: idempotency key per (source, external_id, content fingerprint); retries reuse the current generation instead of bumping it; concurrent admissions coalesce (workflow id = asset id). Only a real content change bumps the generation; that admission uses `signalWithStart` on the asset's workflow with the new generation, and a running workflow switches to it at its next step boundary (continue-as-new), without waiting for the repair deadline; writes from the older generation are already rejected by the fence. An admission with the same key never resets a failed asset (see EMBEDDINGS_SERVICE.md, Failures).
2. Displayed image vs scored image: the search response returns the indexed thumbnail URL (the asset's `assets/` key) and the UI renders that one; results whose product `imageUrl` no longer matches the link's `source_image_url` are dropped at revalidation.
3. Single migration owner: reuse the existing builder/migration path in docker-compose instead of adding a second runner.
4. Late S3 publication after cleanup: bounded publish activity timeout plus the orphan sweep (objects under `assets/` that no asset references and older than 1 day; see Content, source and product identity).
5. Queue ownership: TS search workflows and activities on `search`; only embedding activities go to `embeddings-interactive` / `embeddings-bulk`.
6. Reconcile watermark upper bound and retries for failed attachments outside the overlap window; `next_attempt_at` initialized at admission (same transaction), not at workflow start.

## Progress

### 1. Infra

- [x] 1.1 `docker/postgres/Dockerfile`: PostGIS 17-3.6 + pgvector 0.8.7 (pinned apt version)
- [x] 1.2 Compose `db` builds the image and reuses the `postgres_data` volume
- [x] 1.3 Compose `storage` (RustFS 1.0.5) and `storage-setup` (AWS CLI): bucket, public `assets/`, lifecycle on `staging/` and `query/`; credentials required
- [x] 1.4 Migration `20261113000000_search_extensions` and `extensions = [postgis, pg_trgm, vector]`
- [x] 1.5 CI `database` job builds and runs the same image; TCP healthcheck
- [x] 1.6 S3 variables in `.env.example`
- [x] 1.7 Integration tests: extensions created by migrations; halfvec, HNSW, iterative scan, trigram
- [x] 1.8 Review of step 1

### 2. Schema and repository

- [x] 2.1 Tables from the authoritative schema (embedding_profile, asset, asset_embedding, product_asset, search_session, query_upload, search_state, product.search_text)
- [x] 2.2 Asset search (HNSW + outer re-ordering) and product search (exact)
- [x] 2.3 Integration tests: object keys and orphan detection, row-lock interleavings, filtered recall vs exact, product search at realistic link ratios
- [x] 2.4 Review of step 2 (Codex, 7 rounds; approved 2026-11-14)

### 3. Embeddings service

- [x] 3.1 Spike: text, image, mixed; latency under load; go (TypeScript, no Python): [EMBEDDINGS_RUNTIME.md](EMBEDDINGS_RUNTIME.md)
- [x] 3.1b Spike: image token budget (decided 280, results in [EMBEDDINGS_RUNTIME.md](EMBEDDINGS_RUNTIME.md)) 70 / 140 / 280 (`max_soft_tokens`), same pinned model and q4 session. Per budget: image embedding p50/p95 and throughput at 4 threads (alone and with the text lane measuring), RSS, and on a labelled set of catalog images with text queries (the KPI 2 harness seed, at least 30 queries, plus 15 image-to-image queries) nDCG@10 and recall@10 with exact search. Pick the smallest budget whose nDCG@10 is within 0.02 of 280 (otherwise 280). `TransformersEmbedder` takes the budget as an option, sets it on the image processor, and reports it in the profile (read back from the processor, not from `image_seq_length`). Results in EMBEDDINGS_RUNTIME.md.
- [x] 3.2 `embed-text` (text-only session, `POST /embed/text`) and `embed-image` (priority permit: image queries > interactive > bulk; two activity-only workers; reads outside the permit; dispatch accounting, success-over-failure precedence, deferred repair deadlines), `model-fetch`, compose services with `MODEL_CACHE_DIR` and memory limits; plan: [EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md)
- [x] 3.3 Parity fixtures (fp32 reference + q4 baseline, text-only = full session) and the local loaded-latency and memory check; results in [EMBEDDINGS_RUNTIME.md](EMBEDDINGS_RUNTIME.md). MRL check deferred (768-d only in v1). Still open before activation: loaded latency on the deploy target with a bulk batch (needs step 4), the interleaving test (4.3) and the retrieval gate (7.1)
- [x] 3.4 Contract tests of the activities against `SearchRepositoryService` (fake embedder) in the `database` job

### 3b. Lexical relevance

- [ ] 3b.1 Forward migration: `unaccent`, `simple` + `unaccent` configuration, `product.search_document` (trigger, backfill, GIN), Prisma field; fresh install and upgrade tests
- [ ] 3b.2 Lexical branch (full text, trigram fallback), RRF merge, score breakdown, exact oracle
- [ ] 3b.3 Timeouts and pool limits on the search paths; benchmark at ~117 / 5k / 20k products with ingestion writes
- [ ] 3b.4 Review of step 3b

### 4. Workflows

- [ ] 4.1 Resolve open items 1, 4, 5, 6 in the design before code
- [ ] 4.2 Ingest, delete, batch index, reconcile; compose `search` service depending on `builder`
- [ ] 4.3 Temporal tests and the cross-language batch-of-500 test

### 5. Search API

- [ ] 5.1 Resolve open item 2 in the design before code
- [ ] 5.2 Search endpoints, product search contract, scrape with SSRF tests

### 6. UI

- [ ] 6.1 Search bar with image upload and scrape mode, results grid, debug panel
- [ ] 6.2 `SEARCH_API_URL`, public search URL, `S3_PUBLIC_URL` in the CSP

### 7. KPIs

- [ ] 7.1 KPI runs on the catalog corpus
