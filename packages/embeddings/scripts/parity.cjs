#!/usr/bin/env node
// pnpm parity:fixtures — writes test/fixtures/parity.json for the fixed inputs:
// - `reference`: fp32 graphs of the pinned revision (models.reference.lock.json)
// - `baseline`: the serving q4 graphs (models.lock.json), the accepted output
// Run manually:
//   MODEL_CACHE_DIR=... pnpm models:fetch
//   MODEL_CACHE_DIR=... MODEL_LOCK=reference pnpm models:fetch
//   MODEL_CACHE_DIR=... pnpm parity:fixtures
// On a model, processor or runtime upgrade, run `pnpm test:weights` against the
// committed fixture first; regenerate only after that comparison is reviewed.
// The reference shares the runtime, tokenizer and preprocessing with serving, so
// it guards quantization and upgrades, not an independent implementation.
const { writeFileSync } = require("node:fs");
const path = require("node:path");
const { TransformersEmbedder } = require("../dist/index.js");
const servingLock = require("../models.lock.json");
const referenceLock = require("../models.reference.lock.json");
const { loadParityInputs } = require("./parity-inputs.cjs");

const FIXTURE = path.join(__dirname, "../test/fixtures/parity.json");
const encode = (vector) =>
  Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString(
    "base64",
  );

async function embedAll(inputs, { cacheDir, lock, dtype }) {
  const text = new TransformersEmbedder({
    mode: "text",
    cacheDir,
    lock,
    threads: 2,
    dtype,
  });
  const full = new TransformersEmbedder({
    mode: "full",
    cacheDir,
    lock,
    threads: 4,
    dtype,
  });
  await Promise.all([text.ready(), full.ready()]);
  const vectors = {};
  const queries = await text.embedQueries(inputs.queries);
  queries.forEach((vector, i) => {
    vectors[`query:${i}`] = encode(vector);
  });
  for (const [id, bytes] of inputs.images) {
    const [vector] = await full.embedImages([{ bytes }]);
    vectors[`image:${id}`] = encode(vector);
  }
  for (const [i, item] of inputs.mixed.entries()) {
    const [vector] = await full.embedImages([
      { bytes: inputs.images.get(item.image), text: item.text },
    ]);
    vectors[`mixed:${i}`] = encode(vector);
  }
  return {
    profile: full.profile(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    files: lock.files.map(({ path: file, sha256 }) => ({ path: file, sha256 })),
    vectors,
  };
}

async function main() {
  const cacheDir = process.env.MODEL_CACHE_DIR;
  if (!cacheDir) throw new Error("MODEL_CACHE_DIR is not set");
  const options = { cacheDir: path.resolve(cacheDir) };
  const inputs = await loadParityInputs();
  const reference = await embedAll(inputs, {
    ...options,
    lock: referenceLock,
    dtype: "fp32",
  });
  const baseline = await embedAll(inputs, {
    ...options,
    lock: servingLock,
    dtype: "q4",
  });
  const fixture = {
    generatedAt: new Date().toISOString(),
    inputsSha256: inputs.inputsSha256,
    encoding: "base64 float32 little-endian, L2-normalized",
    reference,
    baseline,
  };
  writeFileSync(FIXTURE, `${JSON.stringify(fixture, null, 2)}\n`);
  console.log(
    `Wrote ${Object.keys(baseline.vectors).length} inputs to ${FIXTURE}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
