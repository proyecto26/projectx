export type EmbedRole = "text" | "image";

export type EmbedConfig = {
  role: EmbedRole;
  port: number;
  environment: string | undefined;
  /** `transformers` (real weights) or `fake` (tests, CI, a laptop without weights) */
  embedder: "transformers" | "fake";
  modelCacheDir: string;
  threads: number;
  temporal: { address: string; namespace: string };
  /** `HH:MM-HH:MM` in UTC; unset means always open */
  bulkWindow: string | undefined;
  s3: {
    endpoint: string | undefined;
    region: string;
    bucket: string;
    forcePathStyle: boolean;
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
  };
};

export const TASK_QUEUES = {
  interactive: "embeddings-interactive",
  bulk: "embeddings-bulk",
} as const;

/** Reads and checks the environment; a bad value stops the process */
export function loadEmbedConfig(
  env: NodeJS.ProcessEnv = process.env,
): EmbedConfig {
  const role = env.EMBED_ROLE;
  if (role !== "text" && role !== "image") {
    throw new Error(
      `EMBED_ROLE must be "text" or "image", got ${JSON.stringify(role)}`,
    );
  }
  const embedder = env.EMBEDDER ?? "transformers";
  if (embedder !== "transformers" && embedder !== "fake") {
    throw new Error(
      `EMBEDDER must be "transformers" or "fake", got ${JSON.stringify(embedder)}`,
    );
  }
  if (embedder === "transformers" && !env.MODEL_CACHE_DIR) {
    throw new Error("MODEL_CACHE_DIR is required");
  }
  const port = Number(
    role === "text"
      ? (env.EMBED_TEXT_PORT ?? 8085)
      : (env.EMBED_IMAGE_PORT ?? 8086),
  );
  const threads = Number(
    role === "text"
      ? (env.EMBED_THREADS_TEXT ?? 2)
      : (env.EMBED_THREADS_IMAGE ?? 4),
  );
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${port}`);
  }
  if (!Number.isInteger(threads) || threads < 1) {
    throw new Error(`Invalid thread count: ${threads}`);
  }
  if (env.BULK_INGESTION_WINDOW) parseWindow(env.BULK_INGESTION_WINDOW);
  if (role === "image") {
    for (const name of ["TEMPORAL_HOST", "S3_BUCKET", "S3_REGION"]) {
      if (!env[name]) throw new Error(`${name} is required for the image role`);
    }
  }
  return {
    role,
    port,
    environment: env.NODE_ENV,
    embedder,
    modelCacheDir: env.MODEL_CACHE_DIR ?? "",
    threads,
    temporal: {
      address: env.TEMPORAL_HOST ?? "",
      namespace: env.TEMPORAL_NAMESPACE || "default",
    },
    bulkWindow: env.BULK_INGESTION_WINDOW || undefined,
    s3: {
      endpoint: env.S3_ENDPOINT || undefined,
      region: env.S3_REGION ?? "",
      bucket: env.S3_BUCKET ?? "",
      forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
      accessKeyId: env.S3_ACCESS_KEY_ID || undefined,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY || undefined,
    },
  };
}

/** `HH:MM-HH:MM` (UTC) to minutes of the day; the end may wrap past midnight */
export function parseWindow(window: string): { start: number; end: number } {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(window);
  const [h1 = 99, m1 = 99, h2 = 99, m2 = 99] =
    match?.slice(1).map(Number) ?? [];
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59) {
    throw new Error(
      `BULK_INGESTION_WINDOW must look like 22:00-06:00 (UTC), got ${window}`,
    );
  }
  return { start: h1 * 60 + m1, end: h2 * 60 + m2 };
}

export function inWindow(window: string | undefined, now: Date): boolean {
  if (!window) return true;
  const { start, end } = parseWindow(window);
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (start === end) return true;
  return start < end
    ? minute >= start && minute < end
    : minute >= start || minute < end;
}
