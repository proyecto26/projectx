import { Controller, Get, HttpCode, HttpStatus, Inject } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductDto } from '@projectx/models';

import { AppService } from './app.service';

@ApiTags('Product')
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  /**
   * Endpoint to retrieve all available products.
   * @returns Array of ProductDto containing the product information.
   */
  @ApiOperation({
    summary: 'Get all products',
    description: 'This endpoint returns all available products',
  })
  @ApiOkResponse({
    description: 'Products retrieved successfully',
    type: ProductDto,
    isArray: true,
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  getProducts() {
    return this.appService.getProducts();
  }
}
