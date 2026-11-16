import sharp from "sharp";

import { ImageDecodeError } from "./embedder";

/**
 * Largest image decoded, in pixels (about 40 MP, 160 MB as RGBA). A small
 * file can declare a huge canvas; sharp's own default allows ~268 MP, more
 * than the image process's memory limit.
 */
export const MAX_IMAGE_PIXELS = 40_000_000;

/**
 * Reads the dimensions from the image header (nothing is decoded) and
 * rejects an image that isn't readable or is larger than `maxPixels`, with
 * ImageDecodeError (terminal `decode_failed`, HTTP 422).
 */
export async function assertDecodableSize(
  bytes: Uint8Array,
  maxPixels = MAX_IMAGE_PIXELS,
): Promise<void> {
  let width: number | undefined;
  let height: number | undefined;
  try {
    ({ width, height } = await sharp(bytes).metadata());
  } catch (error) {
    throw new ImageDecodeError(`Can't read the image: ${String(error)}`, {
      cause: error,
    });
  }
  if (!width || !height) {
    throw new ImageDecodeError("The image has no dimensions");
  }
  if (width * height > maxPixels) {
    throw new ImageDecodeError(
      `The image is ${width}×${height}, more than ${maxPixels} pixels`,
    );
  }
}
