/** What produced a vector; matches `EmbeddingProfileInput` in `@projectx/db`. */
export type EmbeddingProfileSpec = {
  model: string;
  /** Hugging Face commit of the model */
  modelRevision: string;
  dims: number;
  /** Weights variant, e.g. q4 */
  dtype: string;
  /** Inference runtime and version, e.g. transformers.js@4.3.2, or fake */
  runtime: string;
  documentTemplate: string;
  queryPrompt: string | null;
  imageTokenBudget: number | null;
};

export type ImageInput = {
  bytes: Uint8Array;
  /** Optional text for a mixed (text + image) document */
  text?: string;
};

/**
 * Turns text and images into L2-normalized vectors of `profile().dims`
 * dimensions in one shared space.
 */
export interface Embedder {
  /** Resolves once the model is loaded and a warm-up inference ran */
  ready(): Promise<void>;
  profile(): EmbeddingProfileSpec;
  /** Search queries: the profile's query prompt is applied */
  embedQueries(texts: readonly string[]): Promise<Float32Array[]>;
  embedImages(items: readonly ImageInput[]): Promise<Float32Array[]>;
}

/** The bytes are not an image the model can read (terminal for the asset) */
export class ImageDecodeError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ImageDecodeError";
  }
}
