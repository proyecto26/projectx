import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CATALOG_SKU_PREFIXES } from "./seed-catalog";
import { ATECH, NVIDIA, SMITHSONIAN } from "./selection";
import type { CatalogEntry } from "./types";

const catalog: CatalogEntry[] = JSON.parse(
  readFileSync(join(__dirname, "catalog.json"), "utf8"),
);

describe("catalog.json", () => {
  it("has the curated products with unique SKUs", () => {
    expect(catalog).toHaveLength(117);
    expect(new Set(catalog.map((entry) => entry.sku)).size).toBe(117);
  });

  it("leaves out the works excluded on purpose", () => {
    const titles = catalog.map((entry) =>
      String(entry.attributes.originalTitle),
    );
    for (const title of [
      "Model of the Greek Slave",
      "The Dying Tecumseh",
      "Old Arrow Maker",
    ]) {
      expect(titles).not.toContain(title);
    }
  });

  it("points every file to a pinned dataset revision", () => {
    const pinned = [SMITHSONIAN, ATECH, NVIDIA].map(
      ({ dataset, revision }) =>
        `https://huggingface.co/datasets/${dataset}/resolve/${revision}/`,
    );
    for (const entry of catalog) {
      for (const url of [
        entry.imageUrl,
        entry.modelUrl,
        ...entry.downloadUrls,
      ]) {
        expect(pinned.some((prefix) => url.startsWith(prefix))).toBe(true);
      }
    }
  });

  it("names a license and a credit for every product", () => {
    for (const entry of catalog) {
      expect(["CC0-1.0", "CC-BY-4.0"]).toContain(entry.license);
      expect(entry.credit.length).toBeGreaterThan(0);
      if (entry.license === "CC-BY-4.0") {
        expect(entry.credit).toMatch(/Atech|NVIDIA/);
      }
      expect(entry.name.length).toBeLessThanOrEqual(100);
      expect(entry.estimatedPrice).toBeGreaterThan(0);
    }
  });

  it("links NVIDIA models to the original dataset, as CC BY asks", () => {
    for (const entry of catalog.filter((e) => e.sku.startsWith("NV-"))) {
      expect(entry.sourceUrl).toBe(
        "https://huggingface.co/datasets/nvidia/simready-assets",
      );
      expect(entry.modelUrl).toMatch(/\/glb\/[^/]+\.glb$/);
    }
  });

  it("uses a preview that needs no KTX2 decoder", () => {
    for (const entry of catalog.filter((e) => e.sku.startsWith("SI-"))) {
      expect(entry.modelUrl).toMatch(/\/lods\/.+_lod2\.glb$/);
    }
  });

  it("uses SKU prefixes the seed knows how to discontinue", () => {
    for (const entry of catalog) {
      expect(
        CATALOG_SKU_PREFIXES.some((prefix) => entry.sku.startsWith(prefix)),
      ).toBe(true);
    }
  });
});
