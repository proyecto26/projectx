# Embeddings runtime: TypeScript, no Python

Status: decided 2026-11-14 (reviewed with Codex: approve_with_changes 0.92, changes applied). Replaces the Python embeddings service in [VISUAL_SEARCH.md](VISUAL_SEARCH.md); that document's step 3 follows this one.

Question: can Node run EmbeddingGemma 2 with ONNX (transformers.js) so the repo stays TypeScript only?

Context: docs/ai/search/VISUAL_SEARCH.md step 3 planned a Python embeddings service (FastAPI + sentence-transformers). Question: can Node run EmbeddingGemma 2 with ONNX (transformers.js), so the repo stays TypeScript only?

## Evidence

Model: `onnx-community/embeddinggemma-2-ONNX`, revision daa72c51243991dfcaf9f9137d2c573d8f7790c0, dtype q4, Node 24, @huggingface/transformers 4.3.x, CPU (12-core Apple M-series; 8 performance cores). Scripts: spike scripts (not kept in the repo): first run unpinned; then pinned revision with `env.cacheDir` and `session_options.intraOpNumThreads`; mixed input; text-only session.

| Run | text p50 / p95 / max | image query | notes |
|-----|----------------------|-------------|-------|
| q4 alone, unpinned, default threads | 20 / 39 ms | 2.8 s | load 28.5 s, RSS 1.5 GB |
| fp32 alone, unpinned | 17 / 23 ms | 3.2 s | load 194 s, RSS 2.8 GB; similarities equal q4 to 2 decimals |
| q4 pinned, query process 2 threads, alone | 45 / 52 / 68 ms | 7.4 s | |
| q4 pinned, query process 2 threads, while an ingestion process (6 threads) embeds images continuously | 63 / 97 / 185 ms | 11.9 s | ingestion 0.25 img/s during the test; a Postgres 100k benchmark was also running |
| mixed input (`<|image|> title: … | text: …` + image) | – | 5.4 s | 768-d; scores below |

Cross-modal sanity (cosine): tiger image vs "a tiger in the wild" 0.761, vs "two cats on a pink blanket" 0.596; cats image 0.576 / 0.761. Mixed documents: tiger 0.838 / 0.633, cats 0.647 / 0.754 (mixed input improves the margin, as expected).

### Text lane measurements

A text-only session loads only `onnx/model_q4.onnx` (`config.vision_config = null`, `audio_config = null`): load 1.4 s from cache, RSS 0.70 GB, alone p50 53 / p95 80 / max 87 ms (2 threads). The same text-only process measured while a separate image process embeds continuously:

| image process threads | text p50 / p95 / max | image throughput |
|-----------------------|----------------------|------------------|
| 6 | 110 / 216 / 229 ms (fails the gate) | 0.18 img/s |
| 4 | 75 / 133 / 147 ms (passes) | 0.17 img/s |
| 2 | 60 / 83 / 106 ms | 0.12 img/s |

Image throughput barely changes from 4 to 6 threads, so 4 is the default. Each text measurement includes preprocessing (tokenizer) and is measured end to end in the process; HTTP overhead is not included.

### Image token budget (spike 3.1b, 2026-11-14)

`max_soft_tokens` of `Gemma4ImageProcessor` set to 280 (model default), 140 and 70 (Gallery's Instant Media Search), same pinned q4 session, 4 threads, alone. Corpus: the 117 catalog thumbnails (all 512x512 3D renders, so 280 upscales them to 768 px and adds no detail). Queries: each item's description and name (relevant: the item), the 12 categories (relevant: the category's items), and every image against the others (relevant: same category). Paired bootstrap (5,000 resamples) for the change against 280.

| budget | image tokens | p50 / p95 per image | images/s | RSS | nDCG@10 change, all 363 queries (95% CI) | image to image (95% CI) |
|--------|--------------|---------------------|----------|-----|---------------------------------------|-------------------------|
| 280 | 256 | 4.16 / 4.67 s | 0.24 | 1.49 GB | baseline (description 0.690, name 0.704, category 0.677, image 0.644) | baseline |
| 140 | 121 | 1.86 / 2.00 s | 0.54 | 1.51 GB | -0.025 [-0.048, -0.002] | -0.034 [-0.060, -0.012] |
| 70 | 64 | 0.85 / 0.92 s | 1.18 | 1.45 GB | -0.026 [-0.051, -0.003] | -0.037 [-0.062, -0.018] |

Text queries alone change within noise at both budgets (every interval contains 0); image-to-image loses about 0.035 at either. 140 is no better than 70. Mean cosine to the 280 vector of the same image: 0.967 (140), 0.950 (70); top-10 overlap with 280 about 0.75 and 0.70.

Decision: 280. Neither smaller budget is within 0.02 of 280 overall (the rule set before the spike). Cost: ingesting 100k assets takes about 116 h with one image process at 280, about 24 h at 70. The budget is part of the profile, so a later move to 70 (for example once real product photos are labelled) is a re-embed under the profile lifecycle change. `TransformersEmbedder` takes the budget as an option, sets `max_soft_tokens` and reports the value read back from the processor; the profile is registered only after this decision.

## Decision

No Python. Two processes from one NestJS image, model in process with @huggingface/transformers (pinned), loaded offline from the verified revision directory `MODEL_CACHE_DIR/<model>/<revision>/` as a plain local path (library cache off: its tokenizer lookup ignores the revision), every file pinned by `packages/embeddings/models.lock.json` (path, size, sha256) and written only by the one-shot `model-fetch` job:

1. `embed-text` — text lane. Text-only session, `intraOpNumThreads=2`. HTTP `POST /embed/text` on the internal network, used by search for text queries. Nothing else runs in it, so a text query waits only for other text queries (p-limit 1, measured p95 133 ms under full image load). Memory limit 1.5 GB (measured RSS of the text-only session ~880 MB, 2026-11-15).
2. `embed-image` — image lane. One vision+text session, `intraOpNumThreads=4`. Serves, through a single in-process permit (one inference at a time) with strict priority:
   1. image and mixed search queries: HTTP `POST /embed/image` (timeout 20 s; UI shows "searching by image…"),
   2. interactive ingestion: Temporal activities from task queue `embeddings-interactive`,
   3. bulk ingestion: task queue `embeddings-bulk`.
   The permit is granted per item at item boundaries, so an image query waits at most one in-flight image (~3–6 s). Bulk activities process their batch item by item, acquire the permit per item, heartbeat after each item, and honour cancellation between items; a rescheduled attempt skips items already embedded (no checkpoint needed, see [EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md)). Two Temporal `Worker` instances in the process (one per queue, `maxConcurrentActivityTaskExecutions` 1 for bulk, 2 for interactive) share the permit; orchestration workflows stay on `search`. Activities write through `SearchRepositoryService` (fenced: `writeEmbedding(fence, storageKey, profileId, vector)`; payloads stay ids-only). Memory limit 2.5 GB.
   Worker wiring: the temporal-workflows wrapper builds one worker per module registration and requires a workflow bundle today; `embed-image` uses `@temporalio/worker` directly for its two activity-only workers (simple, and keeps the wrapper unchanged). If later wanted, the wrapper can grow an activity-only, multi-queue mode.

Scheduling liveness: priority is strict but bounded: after 20 consecutive higher-priority jobs while lower-priority work waits, one lower-priority item runs (so bulk always progresses), and image queries are admitted only while fewer than 4 are waiting (`503` otherwise). Permit acquisition is cancellable (an AbortSignal tied to the activity's cancellation), and an activity waiting for the permit heartbeats every 10 s with its last committed checkpoint, so waiting never looks like a dead worker and cancellation arrives promptly (heartbeat timeout 60 s).

Repair coordination (superseded in detail by [EMBEDDINGS_SERVICE.md](EMBEDDINGS_SERVICE.md), Duplicate work and Failures): no exclusive ownership; every write is fenced by generation, idempotent and has a fixed success-over-failure precedence, so duplicate work only costs inference. The dispatcher defers the repair deadline (`beginAttempt`) for queued work and the running activity defers it on each heartbeat; the workflow, not the activity retry policy, reschedules after failures, shutdowns and schedule-to-start timeouts (including while bulk ingestion is paused by a window). Repair always re-enters through `embeddings-interactive` only for single assets that were admitted interactively; dataset assets are repaired on `embeddings-bulk`.

Gates before the profile is activated:
- Loaded latency on the deploy target with container CPU limits (embed-text 2 CPUs, embed-image 4 CPUs, on separate cores where the platform allows): text query p95 < 150 ms end to end (HTTP included) while embed-image runs a bulk batch and image queries. Fallback if it fails: lower embed-image threads (2 threads measured 83 ms p95, throughput −30 %), and if that is not enough, bulk ingestion only in a configured window (`BULK_INGESTION_WINDOW`, e.g. 01:00–06:00; the bulk worker is started/stopped by the process on that schedule; interactive ingestion and image queries continue).
- Interleaving test: a batch of 500 on `embeddings-bulk` with interactive items and image queries arriving mid-batch; interactive items and queries complete before the remaining bulk items (asserted from completion order), after a forced worker restart the rescheduled batch completes with the full result.
- Parity: golden vectors for 20 fixed inputs (text, image, mixed) from the reference implementation (sentence-transformers fp32, computed offline once, stored as fixtures); q4 cosine ≥ 0.99 per input, and top-10 neighbour sets of a fixed 500-image catalog sample overlap ≥ 0.9. The text-only session must produce the same text vectors as the full session (cosine ≥ 0.9999; same weights).

Wiring changes:
- `embedding_profile` gets `dtype` and `runtime` (e.g. `transformers.js@4.3.2`) in its unique identity, and `ensureProfile` matches on them. Step 2 is not merged and no profile rows exist anywhere, so the columns go into the unmerged `20261114000000_visual_search` migration (NOT NULL, no default). After merge, any change is a forward migration that adds the column with a backfill of the then-current value.
- Scaling: more image lanes need more allocated CPU and memory (each loads a model copy, 2.5 GB, and ~4 cores); on the same host they compete with embed-text, so the loaded gate is re-run at the supported lane count. Throughput 0.17–0.35 img/s per lane: 10k images ≈ 8–16 h on one lane.

## Risks

- transformers.js support for the Gemma vision encoder is recent: package and model revision pinned; the parity gate catches regressions on upgrade.
- CPU ingestion is slow (one lane ≈ 10k images per 8–16 h); a GPU or hosted endpoint can replace `embed-image` behind the same HTTP/activity interface.
