import {
  AutoConfig,
  AutoModel,
  AutoProcessor,
  env,
  RawImage,
  type Tensor,
} from "@huggingface/transformers";

import {
  type Embedder,
  type EmbeddingProfileSpec,
  ImageDecodeError,
  type ImageInput,
} from "./embedder";
import { assertDecodableSize } from "./image-guard";
import { type ModelLock, revisionDir, verifyModelFiles } from "./model-files";
import { normalize } from "./vector";

/** Search queries; documents (images) get no prefix */
export const QUERY_PROMPT = "task: search result | query: ";
export const DIMS = 768;
export const DTYPE = "q4";
/**
 * Vision tokens per image (`max_soft_tokens`), part of the profile. 280 is
 * the model default; spike 3.1b (EMBEDDINGS_RUNTIME.md) kept it over 140/70.
 */
export const IMAGE_TOKEN_BUDGET = 280;

export type TransformersEmbedderOptions = {
  /** `text`: text-only session (queries); `full`: vision + text */
  mode: "text" | "full";
  cacheDir: string;
  lock: ModelLock;
  threads: number;
  /** Skip hashing at startup (sizes are still checked) */
  verifyHashes?: boolean;
  /** Vision tokens per image, default IMAGE_TOKEN_BUDGET */
  imageTokenBudget?: number;
};

type Processor = ((
  text: string[] | null,
  images?: RawImage | RawImage[] | null,
) => Promise<Record<string, unknown>>) & {
  image_processor?: { max_soft_tokens?: number };
};
type Model = (inputs: Record<string, unknown>) => Promise<{
  sentence_embedding: Tensor;
}>;

/**
 * EmbeddingGemma 2 (ONNX, q4) in process with @huggingface/transformers,
 * loaded only from the verified local cache; nothing is downloaded.
 */
export class TransformersEmbedder implements Embedder {
  private loading?: Promise<void>;
  private processor?: Processor;
  private model?: Model;
  private imageTokenBudget: number | null = null;

  constructor(private readonly options: TransformersEmbedderOptions) {}

  ready(): Promise<void> {
    this.loading ??= this.load();
    return this.loading;
  }

  profile(): EmbeddingProfileSpec {
    return {
      model: this.options.lock.model,
      modelRevision: this.options.lock.revision,
      dims: DIMS,
      dtype: DTYPE,
      runtime: `transformers.js@${env.version}`,
      documentTemplate: "image",
      queryPrompt: QUERY_PROMPT,
      imageTokenBudget: this.imageTokenBudget,
    };
  }

  async embedQueries(texts: readonly string[]): Promise<Float32Array[]> {
    const { processor, model } = this.loaded();
    const inputs = await processor(texts.map((text) => QUERY_PROMPT + text));
    return rows(await model(inputs));
  }

  async embedImages(items: readonly ImageInput[]): Promise<Float32Array[]> {
    if (this.options.mode !== "full") {
      throw new Error("This embedder was loaded without the vision encoder");
    }
    const { processor, model } = this.loaded();
    const vectors: Float32Array[] = [];
    // One image at a time: CPU inference gains nothing from batching, and
    // the caller holds the priority permit per item
    for (const item of items) {
      await assertDecodableSize(item.bytes);
      const image = await RawImage.fromBlob(
        new Blob([Buffer.from(item.bytes)]),
      ).catch((error: unknown) => {
        throw new ImageDecodeError(`Can't decode the image: ${String(error)}`, {
          cause: error,
        });
      });
      const text = item.text === undefined ? null : [item.text];
      const [vector] = rows(await model(await processor(text, image)));
      vectors.push(vector);
    }
    return vectors;
  }

  private loaded() {
    if (!this.processor || !this.model) {
      throw new Error("The embedder is not ready: await ready() first");
    }
    return { processor: this.processor, model: this.model };
  }

  private async load() {
    const { cacheDir, lock, mode, threads } = this.options;
    await verifyModelFiles(cacheDir, lock, { hash: this.options.verifyHashes });
    // Load from the verified revision directory as a plain local path. The
    // library's own cache can't be used: some of its lookups (the tokenizer)
    // ignore the revision and would silently fetch or read `main`.
    const dir = revisionDir(cacheDir, lock);
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.useFSCache = false;

    const config = await AutoConfig.from_pretrained(dir);
    const mutable = config as unknown as Record<string, unknown>;
    mutable.audio_config = null;
    if (mode === "text") mutable.vision_config = null;

    const processor = (await AutoProcessor.from_pretrained(
      dir,
    )) as unknown as Processor;
    const budget = this.options.imageTokenBudget ?? IMAGE_TOKEN_BUDGET;
    if (!Number.isInteger(budget) || budget <= 0) {
      throw new RangeError(
        `imageTokenBudget must be a positive integer: ${budget}`,
      );
    }
    const imageProcessor = processor.image_processor;
    if (!imageProcessor) {
      throw new Error(
        "The processor has no image processor to set the budget on",
      );
    }
    // Set in both modes, so text-only and full sessions register one profile
    imageProcessor.max_soft_tokens = budget;
    // Reported as read back, so the profile records what the processor uses
    this.imageTokenBudget = imageProcessor.max_soft_tokens ?? null;
    this.processor = processor;
    this.model = (await AutoModel.from_pretrained(dir, {
      config,
      device: "cpu",
      dtype: DTYPE,
      session_options: { intraOpNumThreads: threads, interOpNumThreads: 1 },
    })) as unknown as Model;

    // Warm-up, so the first real request doesn't pay for graph setup
    await this.embedQueries(["warm-up"]);
  }
}

function rows(output: { sentence_embedding: Tensor }): Float32Array[] {
  const tensor = output.sentence_embedding;
  const [count, dims] = tensor.dims;
  if (dims !== DIMS)
    throw new Error(`Expected ${DIMS} dimensions, got ${dims}`);
  const data = tensor.data as Float32Array;
  return Array.from({ length: count }, (_, i) =>
    normalize(Float32Array.from(data.subarray(i * dims, (i + 1) * dims))),
  );
}
