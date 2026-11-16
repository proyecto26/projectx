import {
  BadRequestException,
  Body,
  Controller,
  GatewayTimeoutException,
  HttpCode,
  Inject,
  Post,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Embedder } from "@projectx/embeddings";

import { Limiter, LimiterFullError } from "../common/limiter";
import { ProfileService } from "../embedder/profile.service";
import { EMBEDDER } from "../embedder/tokens";

export const MAX_TEXTS = 8;
export const MAX_TEXT_BYTES = 2048;
/** Requests waiting behind the one running; more get 503 */
export const MAX_TEXT_WAITING = 16;
/** A query waits at most this long; a search past it is no longer useful */
export const TEXT_QUERY_DEADLINE_MS = 5_000;

/**
 * The part of the HTTP response the controller reads. The response, not the
 * request: a request emits "close" as soon as its body is read.
 */
export type ClosableResponse = {
  readonly writableFinished: boolean;
  once(event: "close", listener: () => void): unknown;
};

export type EmbedTextResponse = {
  vectors: number[][];
  profileId: number;
  ms: number;
};

/**
 * Query embeddings for the search API: one inference at a time, a bounded
 * queue, a deadline, and a request that goes away leaves the queue. An
 * inference already running finishes (ONNX can't be interrupted) and a late
 * result is discarded.
 */
@Controller()
export class TextController {
  private readonly serial = new Limiter(1, MAX_TEXT_WAITING);
  /** Overridable in tests */
  deadlineMs = TEXT_QUERY_DEADLINE_MS;

  constructor(
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(ProfileService) private readonly profile: ProfileService,
  ) {}

  @Post("text")
  @HttpCode(200)
  async embedText(
    @Body() body: unknown,
    @Res({ passthrough: true }) response?: ClosableResponse,
  ): Promise<EmbedTextResponse> {
    const texts = parseTexts(body);
    const started = performance.now();
    const gone = new AbortController();
    response?.once("close", () => {
      if (!response.writableFinished)
        gone.abort(new Error("The client went away"));
    });
    const deadline = AbortSignal.timeout(this.deadlineMs);
    const signal = AbortSignal.any([deadline, gone.signal]);
    let vectors: Float32Array[];
    try {
      vectors = await this.serial.run(
        () => this.embedder.embedQueries(texts),
        signal,
      );
    } catch (error) {
      if (error instanceof LimiterFullError) {
        throw new ServiceUnavailableException(
          "Too many text queries are waiting",
        );
      }
      if (deadline.aborted)
        throw new GatewayTimeoutException("The text query timed out");
      throw error;
    }
    if (deadline.aborted)
      throw new GatewayTimeoutException("The text query timed out");
    return {
      vectors: vectors.map((v) => Array.from(v)),
      profileId: this.profile.profileId,
      ms: Math.round(performance.now() - started),
    };
  }
}

export function parseTexts(body: unknown): string[] {
  const texts = (body as { texts?: unknown } | null)?.texts;
  if (!Array.isArray(texts) || texts.length < 1 || texts.length > MAX_TEXTS) {
    throw new BadRequestException(
      `texts must be an array of 1 to ${MAX_TEXTS} strings`,
    );
  }
  for (const text of texts) {
    if (typeof text !== "string" || text.trim() === "") {
      throw new BadRequestException("Every text must be a non-empty string");
    }
    if (Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
      throw new BadRequestException(
        `Every text must be at most ${MAX_TEXT_BYTES} bytes`,
      );
    }
  }
  return texts as string[];
}
