import { describe, expect, it } from "vitest";

import { cosine, FakeEmbedder, normalize, truncate } from "../src";

const norm = (v: Float32Array) => Math.hypot(...v);

describe("FakeEmbedder", () => {
  const embedder = new FakeEmbedder();

  it("returns the same unit vector for the same input", async () => {
    const [a] = await embedder.embedQueries(["a tiger"]);
    const [b] = await new FakeEmbedder().embedQueries(["a tiger"]);
    expect(a).toHaveLength(768);
    expect(norm(a)).toBeCloseTo(1, 5);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it("gives unrelated vectors for different inputs and kinds", async () => {
    const [tiger, cats] = await embedder.embedQueries(["a tiger", "two cats"]);
    const [image] = await embedder.embedImages([
      { bytes: new TextEncoder().encode("a tiger") },
    ]);
    expect(Math.abs(cosine(tiger, cats))).toBeLessThan(0.2);
    expect(Math.abs(cosine(tiger, image))).toBeLessThan(0.2);
  });

  it("depends on the text of a mixed item", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const [plain, mixed] = await embedder.embedImages([
      { bytes },
      { bytes, text: "<|image|> title: drill" },
    ]);
    expect(cosine(plain, mixed)).toBeLessThan(0.99);
  });

  it("reports a fake profile", () => {
    expect(embedder.profile()).toMatchObject({ runtime: "fake", dims: 768 });
  });

  it("runs the image hook, e.g. to simulate a decode failure", async () => {
    const failing = new FakeEmbedder({
      onImage: (_item, index) => {
        if (index === 1) throw new Error("decode_failed");
      },
    });
    await expect(
      failing.embedImages([
        { bytes: new Uint8Array([1]) },
        { bytes: new Uint8Array([2]) },
      ]),
    ).rejects.toThrow("decode_failed");
  });
});

describe("vectors", () => {
  it("normalizes, truncates (MRL) and refuses bad input", () => {
    const v = normalize(Float32Array.from([3, 4, 0, 0]));
    expect(Array.from(v)).toEqual([
      0.6000000238418579, 0.800000011920929, 0, 0,
    ]);
    const t = truncate(Float32Array.from([1, 1, 5, 5]), 2);
    expect(norm(t)).toBeCloseTo(1, 6);
    expect(t[0]).toBeCloseTo(t[1], 6);
    expect(() => normalize(new Float32Array(3))).toThrow(RangeError);
    expect(() => truncate(new Float32Array(4), 5)).toThrow(RangeError);
    expect(() => cosine(new Float32Array(2), new Float32Array(3))).toThrow(
      RangeError,
    );
  });
});
