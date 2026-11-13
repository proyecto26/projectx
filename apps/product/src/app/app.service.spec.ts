import type { ProductRepositoryService } from "@projectx/db";
import { UpdateProductDto } from "@projectx/models";
import { plainToInstance } from "class-transformer";

import { AppService } from "./app.service";

const catalogProduct = {
  id: 7,
  createdBy: 1,
  name: "Allosaurus skull, fossil scan",
  description: "A 3D scan of an Allosaurus skull.",
  sku: "SI-1a2b3c4d",
  imageUrl: "https://huggingface.co/datasets/x/resolve/abc/thumb.webp",
  estimatedPrice: "39.00",
  downloadUrls: ["https://huggingface.co/datasets/x/resolve/abc/model.glb"],
  tags: ["fossil"],
  category: "Fossils",
  status: "Available",
  license: "CC0-1.0",
  credit: "Smithsonian Institution, NMNH Paleobiology",
  sourceUrl: "https://huggingface.co/datasets/x",
  modelUrl: "https://huggingface.co/datasets/x/resolve/abc/model.glb",
  formats: ["glb"],
  attributes: { triangles: 120000, dataset: "x", revision: "abc" },
  createdAt: new Date("2026-11-12T00:00:00Z"),
  updatedAt: new Date("2026-11-12T00:00:00Z"),
  internalNote: "not part of the DTO",
};

describe("AppService", () => {
  it("keeps the catalog fields when it serializes a product", async () => {
    const repository = {
      findProductById: jest.fn().mockResolvedValue(catalogProduct),
    } as unknown as ProductRepositoryService;
    const service = new AppService(repository);

    const product = await service.getProductById(7);

    expect(product).toMatchObject({
      license: "CC0-1.0",
      credit: "Smithsonian Institution, NMNH Paleobiology",
      sourceUrl: "https://huggingface.co/datasets/x",
      modelUrl: "https://huggingface.co/datasets/x/resolve/abc/model.glb",
      formats: ["glb"],
      attributes: { triangles: 120000, dataset: "x", revision: "abc" },
      estimatedPrice: 39,
    });
    expect(product).not.toHaveProperty("internalNote");
  });
});

describe("UpdateProductDto attributes", () => {
  const toDto = (input: Record<string, unknown>) =>
    plainToInstance(UpdateProductDto, input, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

  it("leaves attributes out of a partial update", () => {
    expect(
      toDto({ id: 7, name: "Renamed product" }).attributes,
    ).toBeUndefined();
  });

  it("keeps an explicit request to clear them", () => {
    expect(toDto({ id: 7, attributes: null }).attributes).toBeNull();
  });
});
