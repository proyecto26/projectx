import { crc32 } from "node:zlib";

import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { ImageDecodeError } from "../src/lib/embedder";
import { assertDecodableSize, MAX_IMAGE_PIXELS } from "../src/lib/image-guard";

/** A PNG header declaring `width`×`height`, with no pixel data: tiny on disk */
function pngHeader(width: number, height: number): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("assertDecodableSize", () => {
  it("accepts an ordinary image", async () => {
    const png = await sharp({
      create: { width: 64, height: 48, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
    await expect(assertDecodableSize(png)).resolves.toBeUndefined();
  });

  it("rejects a small file that declares a huge canvas, without decoding it", async () => {
    const bomb = pngHeader(20_000, 20_000);
    expect(bomb.length).toBeLessThan(100);
    expect(20_000 * 20_000).toBeGreaterThan(MAX_IMAGE_PIXELS);
    await expect(assertDecodableSize(bomb)).rejects.toBeInstanceOf(
      ImageDecodeError,
    );
  });

  it("rejects bytes that aren't an image", async () => {
    await expect(
      assertDecodableSize(new TextEncoder().encode("not an image")),
    ).rejects.toBeInstanceOf(ImageDecodeError);
  });
});
