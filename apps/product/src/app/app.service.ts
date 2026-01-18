import { Inject, Injectable, Logger } from '@nestjs/common';
import { ProductRepositoryService } from '@projectx/db';
import type { ProductDto } from '@projectx/models';

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
    this.logger.log('getProducts() - retrieving all products');
    return await this.productRepository.findProducts();
  }
}
