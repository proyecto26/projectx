import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform, Type } from "class-transformer";
import {
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { ProductDto } from "../product/product.dto";
import { transformToNumber } from "../transforms";

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

  @ApiProperty({ description: "Price at the time of purchase" })
  @IsOptional()
  @IsNumber()
  @Expose()
  @Transform(({ value }) => transformToNumber(value))
  priceAtPurchase?: number;

  @ApiProperty({ description: "Product details", type: () => ProductDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProductDto)
  @Expose()
  product?: ProductDto;
}
