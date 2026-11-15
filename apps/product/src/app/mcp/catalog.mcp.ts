import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Resource, ResourceTemplate, Tool } from "@nestjs/mcp";
import type { ProductDto } from "@projectx/models";
import * as z from "zod";

import { AppService } from "../app.service";

/** The most products one `search_products` call returns. */
export const MAX_PAGE_SIZE = 50;

/**
 * A product as the MCP server shows it: what `GET /product` returns, without
 * `downloadUrls`, which a catalog lookup doesn't need.
 */
export type CatalogProduct = Omit<ProductDto, "downloadUrls">;

export interface ProductSearchResult {
  total: number;
  page: number;
  limit: number;
  products: CatalogProduct[];
}

const searchProductsInput = z.object({
  query: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Words to look for in the product name or description, case-insensitive, such as "headphones"',
    ),
  category: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Exact category name, as the catalog://categories resource lists them, such as "Audio"',
    ),
  minPrice: z
    .number()
    .nonnegative()
    .optional()
    .describe("Lowest estimated price, inclusive, such as 50"),
  maxPrice: z
    .number()
    .nonnegative()
    .optional()
    .describe("Highest estimated price, inclusive, such as 300"),
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page of results, starting at 1"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(12)
    .describe(`Products per page, from 1 to ${MAX_PAGE_SIZE}. Default 12`),
});

type SearchProductsInput = z.output<typeof searchProductsInput>;

const getProductInput = z.object({
  id: z
    .number()
    .int()
    .positive()
    .describe("The product id, as search_products returns it, such as 5"),
});

type GetProductInput = z.output<typeof getProductInput>;

function toCatalogProduct({
  downloadUrls: _downloadUrls,
  ...product
}: ProductDto): CatalogProduct {
  return product;
}

/**
 * The read-only product catalog, over MCP. It serves what `GET /product`,
 * `GET /product/categories` and `GET /product/:id` serve, through the same
 * service.
 */
@Injectable()
export class CatalogMcp {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  @Tool({
    name: "search_products",
    title: "Search products",
    description:
      "Search the products that are available in the ProjectX store. Filter by words in the name or description, by category, and by estimated price, and page through the results. Returns the total count and one page of products, newest first. Changes nothing.",
    inputSchema: searchProductsInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
  })
  async searchProducts({
    query,
    category,
    minPrice,
    maxPrice,
    page,
    limit,
  }: SearchProductsInput): Promise<ProductSearchResult> {
    if (
      minPrice !== undefined &&
      maxPrice !== undefined &&
      minPrice > maxPrice
    ) {
      throw new BadRequestException(
        `minPrice (${minPrice}) is higher than maxPrice (${maxPrice})`,
      );
    }
    const { products, total } = await this.appService.getProductsFiltered({
      search: query,
      category,
      minPrice,
      maxPrice,
      page,
      limit,
    });
    return { total, page, limit, products: products.map(toCatalogProduct) };
  }

  @Tool({
    name: "get_product",
    title: "Get a product",
    description:
      "Get one product of the ProjectX store by its id: name, description, SKU, image, estimated price, tags, category and status. Use search_products first to find the id. Changes nothing.",
    inputSchema: getProductInput,
    annotations: { readOnlyHint: true, openWorldHint: false },
  })
  async getProduct({ id }: GetProductInput): Promise<CatalogProduct> {
    return this.findProduct(id);
  }

  @Resource({
    uri: "catalog://categories",
    name: "categories",
    title: "Product categories",
    description:
      "Every category that has available products, in alphabetical order",
    mimeType: "application/json",
  })
  categories(): Promise<string[]> {
    return this.appService.getCategories();
  }

  @ResourceTemplate({
    uriTemplate: "product://{id}",
    name: "product",
    title: "Product",
    description: "One product of the catalog, by its numeric id",
    mimeType: "application/json",
  })
  async product({ id }: { id: string }): Promise<CatalogProduct> {
    // product://abc names no product, rather than being a bad request.
    if (!/^\d+$/.test(id)) {
      throw new NotFoundException(`No product has the id ${id}`);
    }
    return this.findProduct(Number(id));
  }

  private async findProduct(id: number): Promise<CatalogProduct> {
    const product = await this.appService.getProductById(id);
    if (!product) {
      throw new NotFoundException(`No product has the id ${id}`);
    }
    return toCatalogProduct(product);
  }
}
