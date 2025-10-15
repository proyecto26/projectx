import { Injectable, Logger } from "@nestjs/common";
import type { ProductRepositoryService } from "@projectx/db";
import type { ProductDto } from "@projectx/models";

@Injectable()
export class AppService {
  readonly logger = new Logger(AppService.name);

  constructor(private readonly productRepository: ProductRepositoryService) {}

  /**
   * Retrieves all available products.
   * @returns Array of ProductDto containing the product information.
   */
  async getProducts(): Promise<ProductDto[]> {
    this.logger.log("getProducts() - retrieving all products");
    return await this.productRepository.findProducts();
  }
}
