import { McpRegistry } from "@nestjs/mcp";
import { connectMcpClient } from "@nestjs/mcp/testing";
import { Test, type TestingModule } from "@nestjs/testing";
import { PrismaService, ProductRepositoryService } from "@projectx/db";

import { AppModule } from "../app.module";

interface StoredProduct {
  id: number;
  createdBy: number;
  name: string;
  description: string;
  sku: string;
  imageUrl: string;
  estimatedPrice: number;
  downloadUrls: string[];
  tags: string[];
  category: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FilterParams {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

const createdAt = new Date("2026-10-01T10:00:00.000Z");

function storedProduct(
  id: number,
  name: string,
  category: string,
  estimatedPrice: number,
): StoredProduct {
  return {
    id,
    createdBy: 1,
    name,
    description: `${name} for the test catalog`,
    sku: `TEST-${id}`,
    imageUrl: `https://example.com/${id}.png`,
    estimatedPrice,
    downloadUrls: [`https://example.com/files/${id}.zip`],
    tags: ["test"],
    category,
    status: "Available",
    createdAt,
    updatedAt: createdAt,
  };
}

const PRODUCTS = [
  storedProduct(1, "Studio Headphones", "Audio", 199.99),
  storedProduct(2, "Pocket Speaker", "Audio", 49.5),
  storedProduct(3, "Smart Plug", "Home Automation", 25),
];

/** Stands in for the database; records what the catalog asked for. */
class FakeProductRepository {
  readonly calls: FilterParams[] = [];

  async findProductsFiltered(params: FilterParams) {
    this.calls.push(params);
    const { page = 1, limit = 12 } = params;
    const matches = PRODUCTS.filter(
      (product) =>
        (!params.category || product.category === params.category) &&
        (!params.search ||
          product.name.toLowerCase().includes(params.search.toLowerCase())) &&
        (params.minPrice === undefined ||
          product.estimatedPrice >= params.minPrice) &&
        (params.maxPrice === undefined ||
          product.estimatedPrice <= params.maxPrice),
    );
    return {
      products: matches.slice((page - 1) * limit, page * limit),
      total: matches.length,
    };
  }

  async findCategories() {
    return [...new Set(PRODUCTS.map((product) => product.category))].sort();
  }

  async findProductById(id: number) {
    return PRODUCTS.find((product) => product.id === id) ?? null;
  }
}

interface ToolResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

function asToolResult(result: unknown): ToolResult {
  return result as ToolResult;
}

function textOf(result: unknown): string {
  const [first] = asToolResult(result).content;
  if (first?.type !== "text" || first.text === undefined) {
    throw new Error("Expected a text block");
  }
  return first.text;
}

function jsonOf(result: unknown): unknown {
  return JSON.parse(textOf(result));
}

type McpClient = Awaited<ReturnType<typeof connectMcpClient>>;

describe("Product catalog MCP server", () => {
  let moduleRef: TestingModule;
  let client: McpClient;
  let repository: FakeProductRepository;

  beforeAll(async () => {
    repository = new FakeProductRepository();
    moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({ $connect: async () => {}, $disconnect: async () => {} })
      .overrideProvider(ProductRepositoryService)
      .useValue(repository)
      .compile();
    client = await connectMcpClient(moduleRef);
  });

  afterAll(async () => {
    await client.close();
    await moduleRef.close();
  });

  beforeEach(() => {
    repository.calls.length = 0;
  });

  it("serves two read-only tools, and nothing that writes", async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_product",
      "search_products",
    ]);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }
  });

  it("describes every tool and argument for the model", async () => {
    const { tools } = await client.listTools();

    const undescribed: string[] = [];
    for (const tool of tools) {
      expect(tool.description?.length).toBeGreaterThan(40);
      const properties = (tool.inputSchema.properties ?? {}) as Record<
        string,
        { description?: string }
      >;
      expect(Object.keys(properties).length).toBeGreaterThan(0);
      for (const [name, property] of Object.entries(properties)) {
        if ((property.description?.length ?? 0) < 10) {
          undescribed.push(`${tool.name}.${name}`);
        }
      }
    }
    expect(undescribed).toEqual([]);
    // The registry holds the same tools the client sees.
    expect(moduleRef.get(McpRegistry).tools).toHaveLength(tools.length);
  });

  it("lists the categories resource and the product template", async () => {
    const { resources } = await client.listResources();
    const { resourceTemplates } = await client.listResourceTemplates();

    expect(resources.map((resource) => resource.uri)).toEqual([
      "catalog://categories",
    ]);
    expect(resourceTemplates.map((template) => template.uriTemplate)).toEqual([
      "product://{id}",
    ]);
  });

  it("searches with every filter through the shared product query", async () => {
    const result = await client.callTool({
      name: "search_products",
      arguments: {
        query: "speaker",
        category: "Audio",
        minPrice: 10,
        maxPrice: 100,
        page: 1,
        limit: 5,
      },
    });

    expect(asToolResult(result).isError).toBeFalsy();
    expect(repository.calls).toEqual([
      {
        search: "speaker",
        category: "Audio",
        minPrice: 10,
        maxPrice: 100,
        page: 1,
        limit: 5,
      },
    ]);
    expect(jsonOf(result)).toMatchObject({
      total: 1,
      page: 1,
      limit: 5,
      products: [{ id: 2, name: "Pocket Speaker", estimatedPrice: 49.5 }],
    });
  });

  it("pages with the HTTP API's defaults, and leaves download URLs out", async () => {
    const result = await client.callTool({
      name: "search_products",
      arguments: {},
    });

    expect(repository.calls).toEqual([
      expect.objectContaining({ page: 1, limit: 12 }),
    ]);
    const body = jsonOf(result) as {
      total: number;
      products: Array<Record<string, unknown>>;
    };
    expect(body.total).toBe(PRODUCTS.length);
    for (const product of body.products) {
      expect(product).not.toHaveProperty("downloadUrls");
    }
  });

  it("tells the model about arguments the schema refuses", async () => {
    const result = await client.callTool({
      name: "search_products",
      arguments: { limit: 500 },
    });

    expect(asToolResult(result).isError).toBe(true);
    expect(textOf(result)).toContain("Input validation error");
    expect(repository.calls).toHaveLength(0);
  });

  it("refuses a price range that is upside down", async () => {
    const result = await client.callTool({
      name: "search_products",
      arguments: { minPrice: 300, maxPrice: 50 },
    });

    expect(asToolResult(result).isError).toBe(true);
    expect(textOf(result)).toBe("minPrice (300) is higher than maxPrice (50)");
    expect(repository.calls).toHaveLength(0);
  });

  it("gets one product by id", async () => {
    const result = await client.callTool({
      name: "get_product",
      arguments: { id: 1 },
    });

    expect(asToolResult(result).isError).toBeFalsy();
    const product = jsonOf(result);
    expect(product).toMatchObject({
      id: 1,
      name: "Studio Headphones",
      sku: "TEST-1",
      estimatedPrice: 199.99,
    });
    expect(product).not.toHaveProperty("downloadUrls");
  });

  it("answers an unknown product id with a tool error", async () => {
    const result = await client.callTool({
      name: "get_product",
      arguments: { id: 404 },
    });

    expect(asToolResult(result).isError).toBe(true);
    expect(textOf(result)).toBe("No product has the id 404");
  });

  it("reads the categories", async () => {
    const { contents } = await client.readResource({
      uri: "catalog://categories",
    });

    expect(contents).toHaveLength(1);
    expect(contents[0]).toMatchObject({
      uri: "catalog://categories",
      mimeType: "application/json",
    });
    expect(JSON.parse((contents[0] as { text: string }).text)).toEqual([
      "Audio",
      "Home Automation",
    ]);
  });

  it("reads a product through its URI", async () => {
    const { contents } = await client.readResource({ uri: "product://3" });

    expect(JSON.parse((contents[0] as { text: string }).text)).toMatchObject({
      id: 3,
      name: "Smart Plug",
    });
  });

  it.each([
    "product://999",
    "product://abc",
  ])("knows no product at %s", async (uri) => {
    await expect(client.readResource({ uri })).rejects.toThrow();
  });

  it("serves clients of the 2025 protocol revisions", async () => {
    const legacy = await connectMcpClient(moduleRef, { era: "legacy" });
    try {
      expect(legacy.getProtocolEra()).toBe("legacy");
      const result = await legacy.callTool({
        name: "get_product",
        arguments: { id: 2 },
      });
      expect(jsonOf(result)).toMatchObject({ id: 2 });
    } finally {
      await legacy.close();
    }
  });
});
