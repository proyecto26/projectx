/**
 * Builds `catalog.json` from `selection.ts` and the pinned Hugging Face datasets.
 *
 *   pnpm catalog:build          write catalog.json
 *   pnpm catalog:check          fail if catalog.json differs from a fresh build
 *   pnpm catalog:verify-urls    fail if any image, model or download URL is unreachable
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ATECH,
  atechSelection,
  basePrice,
  NVIDIA,
  nvidiaSelection,
  type Selected,
  SMITHSONIAN,
  smithsonianSelection,
} from "./selection";
import type { CatalogEntry } from "./types";

const here = dirname(fileURLToPath(import.meta.url));
const catalogPath = join(here, "catalog.json");
const HF = "https://huggingface.co";

const resolveUrl = (dataset: string, revision: string, path: string) =>
  `${HF}/datasets/${dataset}/resolve/${revision}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

const treeUrl = (dataset: string, revision: string, path: string) =>
  `${HF}/datasets/${dataset}/tree/${revision}/${path}`;

/** Small stable hash, so prices don't change between builds */
function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619) >>> 0;
  }
  return value;
}

const priceOf = (item: Selected) =>
  basePrice[item.category] + (hash(item.id) % 5) * 4;

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

type SmithsonianRecord = {
  id: string;
  title: string;
  license: string;
  authors: string;
  triangles: number;
  thumbnail: string;
  files: Record<string, string | undefined>;
};

function isSmithsonianRecord(value: unknown): value is SmithsonianRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.authors === "string" &&
    typeof record.thumbnail === "string" &&
    typeof record.files === "object" &&
    record.files !== null
  );
}

async function smithsonianEntries(): Promise<CatalogEntry[]> {
  const { dataset, revision, license } = SMITHSONIAN;
  const lines = await fetchText(
    resolveUrl(dataset, revision, "metadata.jsonl"),
  );
  const records = new Map<string, SmithsonianRecord>();
  for (const line of lines.split("\n")) {
    if (!line.trim()) continue;
    const parsed: unknown = JSON.parse(line);
    if (isSmithsonianRecord(parsed)) records.set(parsed.id, parsed);
  }

  return smithsonianSelection.map((item) => {
    const record = records.get(item.id);
    if (!record) throw new Error(`Smithsonian asset not found: ${item.id}`);
    if (record.license !== license) {
      throw new Error(`Unexpected license ${record.license} for ${item.id}`);
    }
    const preview = record.files.lod2;
    const full = record.files.web;
    if (!preview || !full) throw new Error(`Missing GLB files for ${item.id}`);
    return {
      sku: `SI-${item.id.slice(-8)}`,
      name: item.name,
      description: item.description,
      category: item.category,
      tags: item.tags,
      estimatedPrice: priceOf(item),
      imageUrl: resolveUrl(dataset, revision, record.thumbnail),
      modelUrl: resolveUrl(dataset, revision, preview),
      downloadUrls: [resolveUrl(dataset, revision, full)],
      formats: ["glb"],
      license,
      credit: `${record.authors} (CC0)`,
      sourceUrl: treeUrl(dataset, revision, dirname(full)),
      attributes: {
        source: "smithsonian",
        assetId: item.id,
        originalTitle: record.title,
        triangles: record.triangles,
        dataset,
        revision,
      },
    };
  });
}

type TreeEntry = { type: string; path: string };

function isTreeEntry(value: unknown): value is TreeEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.type === "string" && typeof entry.path === "string";
}

async function atechEntries(): Promise<CatalogEntry[]> {
  const { dataset, revision, license, credit } = ATECH;
  const entries: CatalogEntry[] = [];
  for (const item of atechSelection) {
    const parsed: unknown = JSON.parse(
      await fetchText(
        `${HF}/api/datasets/${dataset}/tree/${revision}/${item.id}?recursive=true`,
      ),
    );
    if (!Array.isArray(parsed)) throw new Error(`No file list for ${item.id}`);
    const files = parsed
      .filter(isTreeEntry)
      .filter((entry) => entry.type === "file")
      .map((entry) => entry.path);

    const slug = item.id.replace(/^\d+_/, "");
    const glb = `${item.id}/gltf/${slug}.glb`;
    const thumb = `${item.id}/simready_usd/.thumbs/256x256/${slug}.usd_transparent.png`;
    for (const path of [glb, thumb]) {
      if (!files.includes(path)) throw new Error(`Missing ${path}`);
    }
    const stls = files
      .filter((path) => path.startsWith(`${item.id}/mjcf/meshes/`))
      .filter((path) => path.endsWith(".stl"))
      .sort();

    entries.push({
      sku: `AT-${item.id.slice(0, 2)}`,
      name: item.name,
      description: item.description,
      category: item.category,
      tags: item.tags,
      estimatedPrice: priceOf(item),
      imageUrl: resolveUrl(dataset, revision, thumb),
      modelUrl: resolveUrl(dataset, revision, glb),
      downloadUrls: [glb, ...stls].map((path) =>
        resolveUrl(dataset, revision, path),
      ),
      formats: stls.length > 0 ? ["glb", "stl"] : ["glb"],
      license,
      credit,
      sourceUrl: treeUrl(dataset, revision, item.id),
      attributes: {
        source: "atech",
        assetId: item.id,
        stlParts: stls.length,
        dataset,
        revision,
      },
    });
  }
  return entries;
}

type NvidiaRecord = {
  asset: string;
  glb: string;
  thumbnail: string;
  license: string;
  size_mb: number;
  triangles: number;
};

function isNvidiaRecord(value: unknown): value is NvidiaRecord {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.asset === "string" &&
    typeof record.glb === "string" &&
    typeof record.thumbnail === "string" &&
    typeof record.size_mb === "number"
  );
}

/** Previews larger than this are too slow to open on a phone */
const MAX_PREVIEW_MB = 5;

async function nvidiaEntries(): Promise<CatalogEntry[]> {
  const { dataset, revision, source, license, credit } = NVIDIA;
  const lines = await fetchText(
    resolveUrl(dataset, revision, "metadata.jsonl"),
  );
  const records = new Map<string, NvidiaRecord>();
  for (const line of lines.split("\n")) {
    if (!line.trim()) continue;
    const parsed: unknown = JSON.parse(line);
    if (isNvidiaRecord(parsed)) records.set(parsed.asset, parsed);
  }

  return nvidiaSelection.map((item) => {
    const record = records.get(item.id);
    if (!record) throw new Error(`NVIDIA asset not found: ${item.id}`);
    if (record.license !== license) {
      throw new Error(`Unexpected license ${record.license} for ${item.id}`);
    }
    if (record.size_mb > MAX_PREVIEW_MB) {
      throw new Error(`${item.id} is ${record.size_mb} MB, pick a lighter one`);
    }
    const glb = resolveUrl(dataset, revision, record.glb);
    return {
      sku: `NV-${hash(item.id).toString(36).toUpperCase()}`,
      name: item.name,
      description: item.description,
      category: item.category,
      tags: item.tags,
      estimatedPrice: priceOf(item),
      imageUrl: resolveUrl(dataset, revision, record.thumbnail),
      modelUrl: glb,
      downloadUrls: [glb],
      formats: ["glb"],
      license,
      credit,
      // CC BY asks to link the original work, not the converted copy
      sourceUrl: `${HF}/datasets/${source}`,
      attributes: {
        source: "nvidia",
        assetId: item.id,
        triangles: record.triangles,
        sizeMb: record.size_mb,
        dataset,
        revision,
        convertedFrom: source,
      },
    };
  });
}

export async function buildCatalog(): Promise<CatalogEntry[]> {
  const catalog = [
    ...(await smithsonianEntries()),
    ...(await atechEntries()),
    ...(await nvidiaEntries()),
  ];
  const skus = new Set(catalog.map((entry) => entry.sku));
  if (skus.size !== catalog.length) throw new Error("Duplicate SKUs");
  return catalog;
}

const serialize = (catalog: CatalogEntry[]) =>
  `${JSON.stringify(catalog, null, 2)}\n`;

async function reachable(url: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { Range: "bytes=0-0" } });
      await response.body?.cancel();
      if (response.ok) return true;
    } catch {
      // Retried below
    }
  }
  return false;
}

async function verifyUrls(catalog: CatalogEntry[]) {
  const urls = [
    ...new Set(
      catalog.flatMap((entry) => [
        entry.imageUrl,
        entry.modelUrl,
        ...entry.downloadUrls,
      ]),
    ),
  ];
  const broken: string[] = [];
  const queue = [...urls];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let url = queue.shift(); url; url = queue.shift()) {
        if (!(await reachable(url))) broken.push(url);
      }
    }),
  );
  console.log(`Checked ${urls.length} URLs, ${broken.length} unreachable`);
  for (const url of broken) console.error(`  ${url}`);
  if (broken.length > 0) process.exitCode = 1;
}

async function main() {
  const mode = process.argv[2] ?? "--write";
  if (mode === "--verify-urls") {
    const catalog: CatalogEntry[] = JSON.parse(
      await readFile(catalogPath, "utf8"),
    );
    await verifyUrls(catalog);
    return;
  }

  const catalog = await buildCatalog();
  if (mode === "--check") {
    const committed = await readFile(catalogPath, "utf8");
    if (committed !== serialize(catalog)) {
      console.error(
        "catalog.json is out of date. Run `pnpm catalog:build` and commit the result.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(`catalog.json is up to date (${catalog.length} products)`);
    return;
  }

  await writeFile(catalogPath, serialize(catalog));
  console.log(`Wrote ${catalog.length} products to ${catalogPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
