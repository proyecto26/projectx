import {
  BadRequestException,
  Body,
  Controller,
  GatewayTimeoutException,
  HttpCode,
  Inject,
  Post,
  ServiceUnavailableException,
  UnprocessableEntityException,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  type Embedder,
  ImageDecodeError,
  PermitFullError,
  type PriorityPermit,
} from "@projectx/embeddings";

import { ProfileService } from "../embedder/profile.service";
import { EMBEDDER, PERMIT } from "../embedder/tokens";
import { MAX_TEXT_BYTES } from "../text/text.controller";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const IMAGE_QUERY_DEADLINE_MS = 20_000;

/** The part of a multer file the controller reads */
export type UploadedImage = { buffer: Buffer; size: number };

export type EmbedImageResponse = {
  vector: number[];
  profileId: number;
  ms: number;
};

/**
 * Image queries: the `query` lane of the shared permit, so a query waits for
 * at most the bulk or interactive inference in flight.
 */
@Controller()
export class ImageController {
  /** Overridable in tests */
  deadlineMs = IMAGE_QUERY_DEADLINE_MS;

  constructor(
    @Inject(EMBEDDER) private readonly embedder: Embedder,
    @Inject(PERMIT) private readonly permit: PriorityPermit,
    @Inject(ProfileService) private readonly profile: ProfileService,
  ) {}

  @Post("image")
  @HttpCode(200)
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async embedImage(
    @UploadedFile() image: UploadedImage | undefined,
    @Body() body: unknown,
  ): Promise<EmbedImageResponse> {
    if (!image || image.size === 0)
      throw new BadRequestException("An image file is required");
    if (image.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(
        `The image must be at most ${MAX_IMAGE_BYTES} bytes`,
      );
    }
    const text = (body as { text?: unknown } | null)?.text;
    if (
      text !== undefined &&
      (typeof text !== "string" || Buffer.byteLength(text) > MAX_TEXT_BYTES)
    ) {
      throw new BadRequestException(
        `text must be a string of at most ${MAX_TEXT_BYTES} bytes`,
      );
    }
    const started = performance.now();
    const deadline = AbortSignal.timeout(this.deadlineMs);
    let release: () => void;
    try {
      release = await this.permit.acquire("query", deadline);
    } catch (error) {
      if (error instanceof PermitFullError) {
        throw new ServiceUnavailableException(
          "Too many image queries are waiting",
        );
      }
      if (deadline.aborted)
        throw new GatewayTimeoutException("The image query timed out");
      throw error;
    }
    let vector: Float32Array | undefined;
    try {
      [vector] = await this.embedder.embedImages([
        {
          bytes: new Uint8Array(image.buffer),
          text: text as string | undefined,
        },
      ]);
    } catch (error) {
      if (error instanceof ImageDecodeError) {
        throw new UnprocessableEntityException(
          "The file is not an image the model can read",
        );
      }
      throw error;
    } finally {
      release();
    }
    // An inference that outlived the deadline finishes, but its result is late
    if (deadline.aborted)
      throw new GatewayTimeoutException("The image query timed out");
    if (!vector) throw new Error("The embedder returned no vector");
    return {
      vector: Array.from(vector),
      profileId: this.profile.profileId,
      ms: Math.round(performance.now() - started),
    };
  }
}
