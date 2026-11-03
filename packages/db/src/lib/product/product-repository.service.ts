import { Inject, Injectable, Logger } from "@nestjs/common";
import { ProductDto, ProductListResponseDto } from "@projectx/models";
import { plainToInstance } from "class-transformer";

import type {
  Prisma,
  Product,
  ProductStatus,
} from "../../../generated/prisma/client";
import { PrismaService } from "../prisma.service";

@Injectable()
export class ProductRepositoryService {
  private logger = new Logger(ProductRepositoryService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createProduct(
    userId: number,
    data: Omit<Prisma.ProductCreateInput, "user">,
  ): Promise<Product> {
    this.logger.verbose(
      `createProduct(${userId}) - product: ${JSON.stringify(data)}`,
    );

    return this.prisma.product.create({
      data: {
        ...data,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async updateProduct(
    productId: number,
    data: Partial<Omit<Prisma.ProductUpdateInput, "user">>,
  ): Promise<Product> {
    this.logger.verbose(
      `updateProduct(${productId}) - data: ${JSON.stringify(data)}`,
    );

    return this.prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  async findProductById(productId: number): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { id: productId },
    });
  }

  async findProductBySku(sku: string): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: { sku },
    });
  }

  async findProducts(
    ...data: Parameters<PrismaService["product"]["findMany"]>
  ): Promise<ProductDto[]> {
    const products = await this.prisma.product.findMany(...data);
    return plainToInstance(ProductDto, products, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }

  async findCategories(): Promise<string[]> {
    this.logger.verbose("findCategories() - retrieving distinct categories");
    const results = await this.prisma.product.findMany({
      where: { category: { not: null }, status: "Available" },
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });
    return results
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c));
  }

  async findProductsFiltered(params: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ProductListResponseDto> {
    const { category, search, page = 1, limit = 12 } = params;
    const where: Prisma.ProductWhereInput = {
      status: "Available",
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [rawProducts, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    const products = plainToInstance(ProductDto, rawProducts, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });

    return { products, total };
  }

  async deleteProduct(productId: number): Promise<Product> {
    return this.prisma.product.delete({
      where: { id: productId },
    });
  }

  async updateProductStatus(
    productId: number,
    status: ProductStatus,
  ): Promise<Product> {
    return this.prisma.product.update({
      where: { id: productId },
      data: { status },
    });
  }
}
