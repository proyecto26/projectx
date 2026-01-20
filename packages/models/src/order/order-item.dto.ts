import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsDefined, IsInt, IsOptional, ValidateNested } from "class-validator";
import { ProductDto } from "../product/product.dto";

export class OrderItemDto {
  @ApiProperty({ description: "Product ID" })
  @IsDefined()
  @IsInt()
  @Expose()
  productId!: number;

  @ApiProperty({ description: "Product quantity" })
  @IsDefined()
  @IsInt()
  @Expose()
  quantity!: number;

  @ApiProperty({ description: "Product details", type: () => ProductDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDto)
  @Expose()
  product?: ProductDto;
}
