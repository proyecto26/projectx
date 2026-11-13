import type { Category } from "./selection";

/** One product of the generated `catalog.json` */
export type CatalogEntry = {
  sku: string;
  name: string;
  description: string;
  category: Category;
  tags: string[];
  /** Price of a demo print, in USD */
  estimatedPrice: number;
  imageUrl: string;
  /** GLB used by the 3D preview */
  modelUrl: string;
  downloadUrls: string[];
  formats: string[];
  /** SPDX license identifier */
  license: string;
  credit: string;
  sourceUrl: string;
  attributes: Record<string, string | number>;
};
