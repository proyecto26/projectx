import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class AdminOrderListItemDto {
  @ApiProperty({ description: "Order ID" })
  @IsInt()
  id!: number;

  @ApiProperty({ description: "Order reference ID" })
  @IsString()
  referenceId!: string;

  @ApiProperty({ description: "Customer name" })
  @IsString()
  customerName!: string;

  @ApiProperty({ description: "Customer email" })
  @IsString()
  customerEmail!: string;

  @ApiProperty({ description: "Order type (e.g., Standard, Express)" })
  @IsString()
  type!: string;

  @ApiProperty({
    description: "Order status",
    enum: [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Failed",
    ],
  })
  @IsString()
  status!: string;

  @ApiProperty({ description: "Total order amount" })
  @IsNumber()
  amount!: number;

  @ApiProperty({ description: "Order creation date" })
  date!: Date;
}

export class AdminOrderListResponseDto {
  @ApiProperty({ description: "List of orders", type: [AdminOrderListItemDto] })
  orders!: AdminOrderListItemDto[];

  @ApiProperty({ description: "Total number of orders" })
  @IsInt()
  total!: number;

  @ApiProperty({ description: "Current page number" })
  @IsInt()
  page!: number;

  @ApiProperty({ description: "Number of items per page" })
  @IsInt()
  limit!: number;
}

export class AdminOrderListQueryDto {
  @ApiPropertyOptional({
    description: "Filter by order status",
    enum: [
      "all",
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled",
      "Failed",
    ],
    default: "all",
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: "Search by customer name, email, or order reference",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Page number", default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Number of items per page",
    default: 10,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? Number.parseInt(value, 10) : undefined))
  @IsInt()
  @Min(1)
  limit?: number;
}
