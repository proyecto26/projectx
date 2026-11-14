import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { ProductDto, ProductListResponseDto } from "@projectx/models";

import { AppService } from "./app.service";

@ApiTags("Product")
@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

  /**
   * Endpoint to retrieve products with optional filtering by category, search, and pagination.
   * @returns ProductListResponseDto with products array and total count.
   */
  @ApiOperation({
    summary: "Get products",
    description:
      "Returns products with optional filtering by category, search, and pagination",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description: "Filter by category",
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search by name or description",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number (default: 1)",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page (default: 12)",
  })
  @ApiOkResponse({
    description: "Products retrieved successfully",
    type: ProductListResponseDto,
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  getProducts(
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.appService.getProductsFiltered({
      category,
      search,
      page: page ? Number.parseInt(page, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Endpoint to retrieve all distinct product categories.
   * @returns Array of category strings.
   */
  @ApiOperation({
    summary: "Get categories",
    description: "Returns all distinct product categories",
  })
  @ApiOkResponse({
    description: "Categories retrieved successfully",
    type: [String],
  })
  @Get("categories")
  @HttpCode(HttpStatus.OK)
  getCategories() {
    return this.appService.getCategories();
  }

  /**
   * Endpoint to retrieve a single product by its ID.
   * @returns ProductDto for the matching product.
   */
  @ApiOperation({
    summary: "Get product by ID",
    description: "Returns a single product by its ID",
  })
  @ApiParam({ name: "id", type: Number, description: "Product ID" })
  @ApiOkResponse({
    description: "Product retrieved successfully",
    type: ProductDto,
  })
  @Get(":id")
  @HttpCode(HttpStatus.OK)
  async getProductById(@Param("id", ParseIntPipe) id: number) {
    const product = await this.appService.getProductById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }
}
