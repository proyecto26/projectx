import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  type Prisma,
  type PrismaClient,
  ProductStatus,
} from "../../generated/prisma/client";
import type { CatalogEntry } from "./types";

/** Demo products from earlier versions, kept so their orders stay valid */
export const LEGACY_SKUS = [
  "TECH-001",
  "PHOTO-001",
  "HOME-001",
  "WEAR-001",
  "AUDIO-001",
];

export function loadCatalog(): CatalogEntry[] {
  const file = join(dirname(fileURLToPath(import.meta.url)), "catalog.json");
  return JSON.parse(readFileSync(file, "utf8")) as CatalogEntry[];
}

function toProductData(
  entry: CatalogEntry,
): Omit<Prisma.ProductCreateInput, "user"> {
  return {
    sku: entry.sku,
    name: entry.name,
    description: entry.description,
    category: entry.category,
    tags: entry.tags,
    estimatedPrice: entry.estimatedPrice,
    imageUrl: entry.imageUrl,
    modelUrl: entry.modelUrl,
    downloadUrls: entry.downloadUrls,
    formats: entry.formats,
    license: entry.license,
    credit: entry.credit,
    sourceUrl: entry.sourceUrl,
    attributes: entry.attributes,
    status: ProductStatus.Available,
  };
}

/** SKU prefixes that `build.ts` gives each source: SI-, AT- and NV- */
export const CATALOG_SKU_PREFIXES = ["SI-", "AT-", "NV-"];

/**
 * Creates or updates every catalog product, so running the seed again applies
 * changes to catalog.json. Legacy demo products, and catalog products that were
 * removed from catalog.json (e.g. a withdrawn source), are discontinued, not
 * deleted, because order items and manufacturer prices still point to them.
 * Adding a SKU back makes it available again.
 */
export async function seedCatalog(
  client: PrismaClient,
  ownerId: number,
  catalog: CatalogEntry[] = loadCatalog(),
) {
  let created = 0;
  let updated = 0;
  for (const entry of catalog) {
    const data = toProductData(entry);
    const existing = await client.product.findUnique({
      where: { sku: entry.sku },
      select: { id: true },
    });
    await client.product.upsert({
      where: { sku: entry.sku },
      update: data,
      create: { ...data, user: { connect: { id: ownerId } } },
    });
    if (existing) updated++;
    else created++;
  }
  const { count: discontinued } = await client.product.updateMany({
    where: {
      status: { not: ProductStatus.Discontinued },
      OR: [
        { sku: { in: LEGACY_SKUS } },
        {
          AND: [
            {
              OR: CATALOG_SKU_PREFIXES.map((prefix) => ({
                sku: { startsWith: prefix },
              })),
            },
            { sku: { notIn: catalog.map((entry) => entry.sku) } },
          ],
        },
      ],
    },
    data: { status: ProductStatus.Discontinued },
  });
  return { created, updated, discontinued };
}
