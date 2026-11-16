import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type LockedFile = { path: string; size: number; sha256: string };

export type ModelLock = {
  model: string;
  revision: string;
  files: LockedFile[];
};

export class ModelFilesError extends Error {
  constructor(readonly problems: string[]) {
    super(`Model files don't match the lock: ${problems.join("; ")}`);
    this.name = "ModelFilesError";
  }
}

/** Where transformers.js keeps a revision's files under its cache dir */
export function revisionDir(cacheDir: string, lock: ModelLock): string {
  return path.join(cacheDir, lock.model, lock.revision);
}

export async function sha256File(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

/**
 * Checks every locked file (size, then sha256) under `cacheDir`. Throws a
 * ModelFilesError listing all missing or different files.
 */
export async function verifyModelFiles(
  cacheDir: string,
  lock: ModelLock,
  options: { hash?: boolean } = {},
): Promise<void> {
  const dir = revisionDir(cacheDir, lock);
  const problems: string[] = [];
  for (const file of lock.files) {
    const full = path.join(dir, file.path);
    const info = await stat(full).catch(() => undefined);
    if (!info?.isFile()) {
      problems.push(`${file.path} is missing`);
      continue;
    }
    if (info.size !== file.size) {
      problems.push(
        `${file.path} has ${info.size} bytes, expected ${file.size}`,
      );
      continue;
    }
    if (options.hash !== false && (await sha256File(full)) !== file.sha256) {
      problems.push(`${file.path} has a different sha256`);
    }
  }
  if (problems.length > 0) throw new ModelFilesError(problems);
}

/**
 * Downloads every locked file that is missing or different into `cacheDir`
 * (the layout transformers.js reads), checking size and sha256 before an
 * atomic rename, so a partial or tampered download is never used.
 */
export async function fetchModelFiles(
  cacheDir: string,
  lock: ModelLock,
  options: {
    baseUrl?: string;
    log?: (message: string) => void;
    fetch?: typeof fetch;
  } = {},
): Promise<{ downloaded: string[] }> {
  const baseUrl = options.baseUrl ?? "https://huggingface.co";
  const log = options.log ?? (() => undefined);
  const doFetch = options.fetch ?? fetch;
  const dir = revisionDir(cacheDir, lock);
  const downloaded: string[] = [];
  for (const file of lock.files) {
    const target = path.join(dir, file.path);
    try {
      await verifyModelFiles(cacheDir, { ...lock, files: [file] });
      continue;
    } catch {
      // missing or different: download it
    }
    const url = `${baseUrl}/${lock.model}/resolve/${lock.revision}/${file.path}`;
    log(`Downloading ${file.path} (${Math.round(file.size / 1e6)} MB)`);
    const response = await doFetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`GET ${url} answered ${response.status}`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    const partial = `${target}.partial`;
    await pipeline(
      Readable.fromWeb(
        response.body as import("node:stream/web").ReadableStream,
      ),
      createWriteStream(partial),
    );
    const size = (await stat(partial)).size;
    const sha256 = await sha256File(partial);
    if (size !== file.size || sha256 !== file.sha256) {
      await rm(partial, { force: true });
      throw new ModelFilesError([
        `${file.path} downloaded with a different size or sha256`,
      ]);
    }
    await rename(partial, target);
    downloaded.push(file.path);
  }
  return { downloaded };
}
