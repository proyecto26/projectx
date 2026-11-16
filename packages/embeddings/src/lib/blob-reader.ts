import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";

/** Largest object the embedding path reads */
export const MAX_BLOB_BYTES = 20 * 1024 * 1024;
export const BLOB_READ_TIMEOUT_MS = 30_000;

/** Why a read failed; maps to the asset error codes */
export type BlobReadErrorKind =
  | "object_missing"
  | "too_large"
  | "fetch_timeout"
  | "storage_unavailable";

export class BlobReadError extends Error {
  constructor(
    readonly kind: BlobReadErrorKind,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "BlobReadError";
  }
}

/** Reads stored bytes by storage key */
export interface BlobReader {
  /**
   * Rejects with BlobReadError, or with the signal's reason when it aborts
   * (the caller's cancellation is not a storage failure).
   */
  get(storageKey: string, signal?: AbortSignal): Promise<Uint8Array>;
}

export type S3BlobReaderOptions = {
  endpoint?: string;
  region: string;
  bucket: string;
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  maxBytes?: number;
  timeoutMs?: number;
  /** For tests */
  client?: S3Client;
};

export class S3BlobReader implements BlobReader {
  private readonly client: S3Client;
  private readonly maxBytes: number;
  private readonly timeoutMs: number;

  constructor(private readonly options: S3BlobReaderOptions) {
    this.maxBytes = options.maxBytes ?? MAX_BLOB_BYTES;
    this.timeoutMs = options.timeoutMs ?? BLOB_READ_TIMEOUT_MS;
    this.client =
      options.client ??
      new S3Client({
        endpoint: options.endpoint,
        region: options.region,
        forcePathStyle: options.forcePathStyle,
        credentials:
          options.accessKeyId && options.secretAccessKey
            ? {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey,
              }
            : undefined,
      });
  }

  async get(storageKey: string, signal?: AbortSignal): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.options.bucket, Key: storageKey }),
        { abortSignal: combined },
      );
      if ((response.ContentLength ?? 0) > this.maxBytes) {
        void response.Body?.transformToWebStream()
          .cancel()
          .catch(() => {});
        throw new BlobReadError(
          "too_large",
          `${storageKey} has ${response.ContentLength} bytes, the limit is ${this.maxBytes}`,
        );
      }
      if (!response.Body) {
        throw new BlobReadError("object_missing", `${storageKey} has no body`);
      }
      const bytes = await readLimited(
        response.Body.transformToWebStream(),
        this.maxBytes,
        storageKey,
      );
      return bytes;
    } catch (error) {
      // The caller's own cancellation is passed through untouched
      if (signal?.aborted) throw signal.reason;
      if (error instanceof BlobReadError) throw error;
      if (timeout.aborted) {
        throw new BlobReadError(
          "fetch_timeout",
          `Reading ${storageKey} took more than ${this.timeoutMs} ms`,
          { cause: error },
        );
      }
      if (error instanceof NoSuchKey || isNotFound(error)) {
        throw new BlobReadError("object_missing", `${storageKey} not found`, {
          cause: error,
        });
      }
      throw new BlobReadError(
        "storage_unavailable",
        `Reading ${storageKey} failed: ${String(error)}`,
        { cause: error },
      );
    }
  }
}

async function readLimited(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
  storageKey: string,
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new BlobReadError(
        "too_large",
        `${storageKey} is larger than ${maxBytes} bytes`,
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const status = (error as { $metadata?: { httpStatusCode?: number } })
    .$metadata?.httpStatusCode;
  const name = (error as { name?: string }).name;
  return status === 404 || name === "NotFound" || name === "NoSuchKey";
}

/** In-memory objects for tests; `delay` simulates a slow store */
export class MemoryBlobReader implements BlobReader {
  readonly objects = new Map<string, Uint8Array>();
  reads = 0;

  constructor(
    private readonly options: {
      delayMs?: number;
      /** Called before each read, e.g. to throw a BlobReadError */
      onRead?: (storageKey: string) => void | Promise<void>;
    } = {},
  ) {}

  put(storageKey: string, bytes: Uint8Array): void {
    this.objects.set(storageKey, bytes);
  }

  async get(storageKey: string, signal?: AbortSignal): Promise<Uint8Array> {
    signal?.throwIfAborted();
    this.reads += 1;
    if (this.options.delayMs) await sleep(this.options.delayMs, signal);
    await this.options.onRead?.(storageKey);
    const bytes = this.objects.get(storageKey);
    if (!bytes) {
      throw new BlobReadError("object_missing", `${storageKey} not found`);
    }
    return bytes;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
