import { Inject, Injectable, Logger } from "@nestjs/common";
import { ProductRepositoryService } from "@projectx/db";
import { ProductDto, type ProductListResponseDto } from "@projectx/models";
import { plainToInstance } from "class-transformer";

@Injectable()
export class AppService {
  readonly logger = new Logger(AppService.name);

  constructor(
    @Inject(ProductRepositoryService)
    private readonly productRepository: ProductRepositoryService,
  ) {}

  /**
   * Retrieves all available products.
   * @returns Array of ProductDto containing the product information.
   */
  async getProducts(): Promise<ProductDto[]> {
    this.logger.log("getProducts() - retrieving all products");
    return await this.productRepository.findProducts();
  }

  /**
   * Retrieves products with optional filtering, search, and pagination.
   * @returns ProductListResponseDto with products array and total count.
   */
  async getProductsFiltered(params: {
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ProductListResponseDto> {
    this.logger.log(
      `getProductsFiltered() - params: ${JSON.stringify(params)}`,
    );
    return await this.productRepository.findProductsFiltered(params);
  }

  /**
   * Retrieves all distinct product categories.
   * @returns Array of category strings.
   */
  async getCategories(): Promise<string[]> {
    this.logger.log("getCategories() - retrieving distinct categories");
    return await this.productRepository.findCategories();
  }

  /**
   * Retrieves a single product by its ID.
   * @returns ProductDto or null if not found.
   */
  async getProductById(id: number): Promise<ProductDto | null> {
    this.logger.log(`getProductById(${id})`);
    const product = await this.productRepository.findProductById(id);
    if (!product) return null;
    return plainToInstance(ProductDto, product, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    });
  }
}
