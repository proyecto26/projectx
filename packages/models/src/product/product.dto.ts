import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

import {
  transformToDate,
  transformToNumber,
  trimTransform,
} from "../transforms";
import { NoProfanity } from "../validators";

export enum ProductStatus {
  Active = "Available",
  Inactive = "Unavailable",
  Deleted = "Discontinued",
}

export class ProductDto {
  constructor(partial?: Partial<ProductDto>) {
    Object.assign(this, partial);
  }

  @ApiProperty({ description: "Unique identifier for the product" })
  @IsDefined()
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({
    description: "Unique identifier for the user who designed the product",
  })
  @IsOptional()
  @IsInt()
  @Expose()
  createdBy?: number;

  @ApiProperty({ description: "Name of the product" })
  @IsDefined()
  @IsString()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  name!: string;

  @ApiProperty({ description: "Description of the product" })
  @IsDefined()
  @IsString()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  description!: string;

  @ApiProperty({
    description:
      "Stock Keeping Unit - Unique identifier for inventory management",
  })
  @IsDefined()
  @IsString()
  @Expose()
  @MaxLength(50)
  @Transform(({ value }) => trimTransform(value))
  sku!: string;

  @ApiProperty({ description: "URL of the product image" })
  @IsDefined()
  @IsString()
  @IsUrl()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  imageUrl!: string;

  @ApiProperty({ description: "Estimated price of the product" })
  @IsDefined()
  @IsNumber()
  @Expose()
  @Transform(({ value }) => transformToNumber(value))
  estimatedPrice!: number;

  @ApiProperty({ description: "Array of download URLs for the product files" })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  @Expose()
  downloadUrls?: string[];

  @ApiProperty({ description: "Array of tags associated with the product" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => value?.map((tag: string) => trimTransform(tag)))
  @Expose()
  tags?: string[];

  @ApiProperty({ description: "Product category" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @Expose()
  category?: string;

  @ApiProperty({
    description: "Status of the product",
    enum: ProductStatus,
    enumName: "ProductStatus",
  })
  @IsEnum(ProductStatus, {
    message: "Status must be one of the defined enum values.",
  })
  @Expose()
  status!: ProductStatus;

  @ApiProperty({ description: "Date the product was created" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  createdAt!: Date;

  @ApiProperty({ description: "Date the product was last updated" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  updatedAt!: Date;
}
