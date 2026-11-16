import { createHash } from "node:crypto";

import type { Embedder, EmbeddingProfileSpec, ImageInput } from "./embedder";
import { normalize } from "./vector";

export type FakeEmbedderOptions = {
  dims?: number;
  /** Called before each image, e.g. to simulate a decode failure */
  onImage?: (item: ImageInput, index: number) => void | Promise<void>;
};

/**
 * Deterministic embedder for tests and CI: the same input always gives the
 * same unit vector, different inputs give unrelated ones. Its profile says
 * `runtime: "fake"`, so its vectors can never share a profile with real ones.
 */
export class FakeEmbedder implements Embedder {
  readonly dims: number;
  private readonly onImage?: FakeEmbedderOptions["onImage"];

  constructor(options: FakeEmbedderOptions = {}) {
    this.dims = options.dims ?? 768;
    this.onImage = options.onImage;
  }

  async ready(): Promise<void> {}

  profile(): EmbeddingProfileSpec {
    return {
      model: "fake",
      modelRevision: "0",
      dims: this.dims,
      dtype: "fp32",
      runtime: "fake",
      documentTemplate: "image",
      queryPrompt: "task: search result | query: ",
      imageTokenBudget: null,
    };
  }

  async embedQueries(texts: readonly string[]): Promise<Float32Array[]> {
    return texts.map((text) => this.vector(["query", text]));
  }

  async embedImages(items: readonly ImageInput[]): Promise<Float32Array[]> {
    const vectors: Float32Array[] = [];
    for (const [index, item] of items.entries()) {
      await this.onImage?.(item, index);
      vectors.push(this.vector(["image", item.bytes, item.text ?? ""]));
    }
    return vectors;
  }

  private vector(parts: (string | Uint8Array)[]): Float32Array {
    const seed = createHash("sha256");
    for (const part of parts) {
      seed.update(typeof part === "string" ? part : Buffer.from(part));
      seed.update("\u0000");
    }
    const digest = seed.digest();
    const vector = new Float32Array(this.dims);
    // Expand the digest with a counter: 8 values (4 bytes each) per block
    for (let block = 0; block * 8 < this.dims; block++) {
      const bytes = createHash("sha256")
        .update(digest)
        .update(String(block))
        .digest();
      for (let i = 0; i < 8 && block * 8 + i < this.dims; i++) {
        vector[block * 8 + i] = bytes.readInt32BE(i * 4) / 0x80000000;
      }
    }
    return normalize(vector);
  }
}
