// Real weights, run manually: MODEL_CACHE_DIR=... pnpm test:weights
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import { cosine, type ModelLock, TransformersEmbedder } from "../src";

const cacheDir = process.env.MODEL_CACHE_DIR ?? "";
const lock = JSON.parse(
  readFileSync(path.join(__dirname, "../models.lock.json"), "utf8"),
) as ModelLock;
const docs =
  "https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main";
const image = async (name: string) =>
  new Uint8Array(await (await fetch(`${docs}/${name}`)).arrayBuffer());

describe.skipIf(!cacheDir)("TransformersEmbedder (real weights)", () => {
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

  beforeAll(async () => {
    await Promise.all([text.ready(), full.ready()]);
  });

  it("registers the same profile from both sessions", () => {
    expect(text.profile()).toEqual(full.profile());
    expect(full.profile()).toMatchObject({
      dims: 768,
      dtype: "q4",
      imageTokenBudget: 280,
    });
    expect(full.profile().runtime).toMatch(/^transformers\.js@\d/);
  });

  it("gives the same text vectors from the text-only session", async () => {
    const queries = [
      "cordless drill",
      "a tiger in the wild",
      "red ceramic vase",
    ];
    const [a, b] = await Promise.all([
      text.embedQueries(queries),
      full.embedQueries(queries),
    ]);
    for (let i = 0; i < queries.length; i++) {
      expect(cosine(a[i], b[i])).toBeGreaterThanOrEqual(0.9999);
    }
  });

  it("matches images to the right description", async () => {
    const [tigerText, catsText] = await text.embedQueries([
      "a tiger in the wild",
      "two cats on a pink blanket",
    ]);
    const [tiger, cats] = await full.embedImages([
      { bytes: await image("tiger.jpg") },
      { bytes: await image("cats.jpg") },
    ]);
    expect(cosine(tiger, tigerText)).toBeGreaterThan(cosine(tiger, catsText));
    expect(cosine(cats, catsText)).toBeGreaterThan(cosine(cats, tigerText));
  });

  it("applies another image token budget and reports it in the profile", async () => {
    const small = new TransformersEmbedder({
      mode: "full",
      cacheDir,
      lock,
      threads: 4,
      imageTokenBudget: 70,
    });
    await small.ready();
    expect(small.profile()).toEqual({
      ...full.profile(),
      imageTokenBudget: 70,
    });
    const bytes = await image("tiger.jpg");
    const [[a], [b]] = await Promise.all([
      full.embedImages([{ bytes }]),
      small.embedImages([{ bytes }]),
    ]);
    // Same image, fewer tokens: close but not the same vector
    expect(cosine(a, b)).toBeGreaterThan(0.85);
    expect(cosine(a, b)).toBeLessThan(0.9999);
  });

  it("refuses images in the text-only session", async () => {
    await expect(
      text.embedImages([{ bytes: new Uint8Array([1]) }]),
    ).rejects.toThrow("without the vision encoder");
  });
});
