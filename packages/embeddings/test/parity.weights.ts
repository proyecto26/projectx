// Parity gate, run manually with real weights: MODEL_CACHE_DIR=... pnpm test:weights
// For every fixed input, the serving q4 output is compared with
// - the accepted q4 baseline (strict: catches tokenizer, preprocessing, graph or
//   runtime drift), and
// - the fp32 reference of the same revision (coarse floors per modality).
// Both live in test/fixtures/parity.json (`pnpm parity:fixtures`).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { cosine, type ModelLock, TransformersEmbedder } from "../src";

type ParityInputs = {
  inputsSha256: string;
  queries: string[];
  images: Map<string, Uint8Array>;
  mixed: { image: string; text: string }[];
};
type Embedded = {
  profile: Record<string, unknown>;
  environment: Record<string, string>;
  vectors: Record<string, string>;
};
type Fixture = {
  inputsSha256: string;
  reference: Embedded;
  baseline: Embedded;
};

/** q4 against the accepted q4 baseline, any input */
const MIN_BASELINE_COSINE = 0.999;
/** q4 against the fp32 reference, per modality (measured minimum minus ~0.005) */
const MIN_REFERENCE_COSINE = { query: 0.985, image: 0.97, mixed: 0.955 };

const require = createRequire(import.meta.url);
const { loadParityInputs } = require("../scripts/parity-inputs.cjs") as {
  loadParityInputs: () => Promise<ParityInputs>;
};
const cacheDir = process.env.MODEL_CACHE_DIR ?? "";
if (process.env.EMBED_WEIGHTS === "1" && !cacheDir) {
  throw new Error("test:weights needs MODEL_CACHE_DIR with the model files");
}
const readJson = <T>(file: string) =>
  JSON.parse(readFileSync(path.join(__dirname, file), "utf8")) as T;
const lock = readJson<ModelLock>("../models.lock.json");
const fixture = readJson<Fixture>("fixtures/parity.json");
const decode = (base64: string) => {
  const bytes = Buffer.from(base64, "base64");
  return new Float32Array(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  );
};

describe.skipIf(!cacheDir)(
  "parity with the q4 baseline and the fp32 reference",
  () => {
    const text = new TransformersEmbedder({
      mode: "text",
      cacheDir,
      lock,
      threads: 2,
    });
    const full = new TransformersEmbedder({
      mode: "full",
      cacheDir,
      lock,
      threads: 4,
    });
    let inputs: ParityInputs;
    const report: Record<
      string,
      { baseline: number; reference: number; floor: number }
    > = {};

    beforeAll(async () => {
      [inputs] = await Promise.all([
        loadParityInputs(),
        text.ready(),
        full.ready(),
      ]);
    });

    const check = (key: string, vector: Float32Array) => {
      const kind = key.split(":")[0] as keyof typeof MIN_REFERENCE_COSINE;
      const baseline = cosine(vector, decode(fixture.baseline.vectors[key]));
      const reference = cosine(vector, decode(fixture.reference.vectors[key]));
      report[key] = { baseline, reference, floor: MIN_REFERENCE_COSINE[kind] };
      expect(baseline, `${key} vs baseline`).toBeGreaterThanOrEqual(
        MIN_BASELINE_COSINE,
      );
      expect(reference, `${key} vs reference`).toBeGreaterThanOrEqual(
        MIN_REFERENCE_COSINE[kind],
      );
    };

    it("was computed from these inputs, this revision and this processor", () => {
      expect(fixture.inputsSha256).toBe(inputs.inputsSha256);
      const total =
        inputs.queries.length + inputs.images.size + inputs.mixed.length;
      expect(total).toBe(20);
      for (const embedded of [fixture.reference, fixture.baseline]) {
        expect(Object.keys(embedded.vectors)).toHaveLength(total);
      }
      // The runtime may differ on an upgrade: that is what this gate compares
      const { runtime: _runtime, dtype: _dtype, ...serving } = full.profile();
      expect(fixture.baseline.profile).toMatchObject({
        ...serving,
        dtype: "q4",
      });
      expect(fixture.reference.profile).toMatchObject({
        ...serving,
        dtype: "fp32",
      });
      console.log(
        `runtime ${full.profile().runtime} on node ${process.version}; baseline from ${fixture.baseline.profile.runtime} on node ${fixture.baseline.environment.node}`,
      );
    });

    it("matches for text queries (text-only session)", async () => {
      const vectors = await text.embedQueries(inputs.queries);
      expect(vectors).toHaveLength(inputs.queries.length);
      for (const [i, vector] of vectors.entries()) check(`query:${i}`, vector);
    });

    it("matches for images", async () => {
      for (const [id, bytes] of inputs.images) {
        const vectors = await full.embedImages([{ bytes }]);
        expect(vectors).toHaveLength(1);
        check(`image:${id}`, vectors[0]);
      }
    });

    it("matches for mixed inputs", async () => {
      for (const [i, item] of inputs.mixed.entries()) {
        const bytes = inputs.images.get(item.image) as Uint8Array;
        const vectors = await full.embedImages([{ bytes, text: item.text }]);
        expect(vectors).toHaveLength(1);
        check(`mixed:${i}`, vectors[0]);
      }
      console.table(report);
      expect(Object.keys(report)).toHaveLength(20);
    });

    it("gives the same text vectors from the text-only and the full session", async () => {
      const [a, b] = await Promise.all([
        text.embedQueries(inputs.queries),
        full.embedQueries(inputs.queries),
      ]);
      expect(a).toHaveLength(inputs.queries.length);
      expect(b).toHaveLength(inputs.queries.length);
      a.forEach((vector, i) => {
        expect(cosine(vector, b[i]), inputs.queries[i]).toBeGreaterThanOrEqual(
          0.9999,
        );
      });
    });
  },
);
