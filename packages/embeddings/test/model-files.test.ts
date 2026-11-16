import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  fetchModelFiles,
  ModelFilesError,
  type ModelLock,
  verifyModelFiles,
} from "../src";

const content = new TextEncoder().encode('{"hello":"model"}');
const lock: ModelLock = {
  model: "org/model",
  revision: "abc123",
  files: [
    {
      path: "config.json",
      size: content.length,
      sha256: createHash("sha256").update(content).digest("hex"),
    },
  ],
};
const serve = (body: Uint8Array, status = 200) =>
  (async () => new Response(body, { status })) as unknown as typeof fetch;

describe("model files", () => {
  it("downloads into the revision layout and verifies", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "models-"));
    await expect(verifyModelFiles(dir, lock)).rejects.toBeInstanceOf(
      ModelFilesError,
    );
    const { downloaded } = await fetchModelFiles(dir, lock, {
      fetch: serve(content),
    });
    expect(downloaded).toEqual(["config.json"]);
    expect(
      await readFile(path.join(dir, "org/model/abc123/config.json"), "utf8"),
    ).toBe('{"hello":"model"}');
    await verifyModelFiles(dir, lock);
    // Already there: nothing downloaded
    expect(
      (await fetchModelFiles(dir, lock, { fetch: serve(content) })).downloaded,
    ).toEqual([]);
  });

  it("refuses a download with other bytes and leaves nothing behind", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "models-"));
    const other = new TextEncoder().encode('{"hello":"other"}');
    await expect(
      fetchModelFiles(dir, lock, { fetch: serve(other) }),
    ).rejects.toBeInstanceOf(ModelFilesError);
    await expect(verifyModelFiles(dir, lock)).rejects.toThrow("missing");
  });

  it("replaces a corrupted local file and reports HTTP errors", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "models-"));
    await mkdir(path.join(dir, "org/model/abc123"), { recursive: true });
    const tampered = new TextEncoder().encode('{"hello":"modeX"}');
    await writeFile(path.join(dir, "org/model/abc123/config.json"), tampered);
    await expect(verifyModelFiles(dir, lock)).rejects.toThrow(
      "different sha256",
    );
    await expect(
      fetchModelFiles(dir, lock, { fetch: serve(content, 404) }),
    ).rejects.toThrow("answered 404");
    await fetchModelFiles(dir, lock, { fetch: serve(content) });
    await verifyModelFiles(dir, lock);
  });
});
