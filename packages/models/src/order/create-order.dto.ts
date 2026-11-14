import { ApiProperty, OmitType } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsArray,
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

import { OrderDto } from "./order.dto";
import { OrderItemDto } from "./order-item.dto";

export class CreateOrderDto extends OmitType(OrderDto, [
  "id",
  "userId",
  "totalPrice",
  "status",
  "createdAt",
  "updatedAt",
] as const) {
  @ApiProperty({
    description: "Unique reference identifier for tracking the order",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsDefined()
  @IsString()
  @Expose()
  referenceId!: string;

  @ApiProperty({
    description: "Items included in the order",
    type: [OrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ description: "Billing address for the order" })
  @IsDefined()
  @IsString()
  billingAddress!: string;

  @ApiProperty({ description: "Payment method for the order", required: false })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ description: "Shipping cost", required: false })
  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @ApiProperty({ description: "Tax amount", required: false })
  @IsOptional()
  @IsNumber()
  taxAmount?: number;
}

export class OrderCreateResponseDto {
  @ApiProperty({ description: "Order ID" })
  @IsDefined()
  @IsInt()
  orderId!: number;

  @ApiProperty({ description: "Reference ID" })
  @IsDefined()
  @IsString()
  referenceId!: string;

  @ApiProperty({ description: "Client secret" })
  @IsDefined()
  @IsString()
  clientSecret!: string;

  @ApiProperty({ description: "Message" })
  @IsDefined()
  @IsString()
  message!: string;
}
