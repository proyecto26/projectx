import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { OrderStatus, PaymentStatus } from "@projectx/models";

class OrderItemDetailDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty()
  productName!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  total!: number;
}

class CustomerInfoDto {
  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;
}

class PaymentInfoDto {
  @ApiProperty({ enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  provider!: string;

  @ApiPropertyOptional()
  transactionId?: string;

  @ApiPropertyOptional()
  paymentMethod?: string;

  @ApiPropertyOptional()
  billingAddress?: string;
}

export class AdminOrderDetailDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  referenceId!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  totalPrice!: number;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty()
  shippingCost!: number;

  @ApiProperty()
  taxAmount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  shippingAddress?: string;

  @ApiProperty({ type: [OrderItemDetailDto] })
  items!: OrderItemDetailDto[];

  @ApiProperty({ type: CustomerInfoDto })
  customer!: CustomerInfoDto;

  @ApiPropertyOptional({ type: PaymentInfoDto })
  payment?: PaymentInfoDto;
}
