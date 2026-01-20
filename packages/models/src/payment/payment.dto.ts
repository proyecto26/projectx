import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { transformToDate, transformToNumber } from "../transforms";

export class PaymentDto {
  @ApiProperty({ description: "Unique identifier for the payment" })
  @IsDefined()
  @IsInt()
  @Expose()
  id!: number;

  @ApiProperty({ description: "Order ID" })
  @IsDefined()
  @IsInt()
  @Expose()
  orderId!: number;

  @ApiProperty({ description: "Payment provider (e.g., Stripe)" })
  @IsDefined()
  @IsString()
  @Expose()
  provider!: string;

  @ApiProperty({ description: "Payment status" })
  @IsDefined()
  @IsString()
  @Expose()
  status!: string;

  @ApiProperty({
    description: "Stripe Payment Intent ID or transaction reference",
  })
  @IsDefined()
  @IsString()
  @Expose()
  transactionId!: string;

  @ApiProperty({ description: "Payment amount" })
  @IsDefined()
  @IsNumber()
  @Expose()
  @Transform(({ value }) => transformToNumber(value))
  amount!: number;

  @ApiProperty({ description: "Payment method details", required: false })
  @IsOptional()
  @IsString()
  @Expose()
  paymentMethod?: string;

  @ApiProperty({ description: "Billing address" })
  @IsOptional()
  @IsString()
  @Expose()
  billingAddress?: string;

  @ApiProperty({ description: "Date the payment was created" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  createdAt!: Date;

  @ApiProperty({ description: "Date the payment was last updated" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  updatedAt!: Date;

  /**
   * Extra info from Stripe (optional, filled by service)
   */

  @ApiProperty({ description: "Card brand", required: false })
  @IsOptional()
  @IsString()
  @Expose()
  cardBrand?: string;

  @ApiProperty({ description: "Last 4 digits of the card", required: false })
  @IsOptional()
  @IsString()
  @Expose()
  last4?: string;

  @ApiProperty({ description: "Expiration month", required: false })
  @IsOptional()
  @IsInt()
  @Expose()
  expMonth?: number;

  @ApiProperty({ description: "Expiration year", required: false })
  @IsOptional()
  @IsInt()
  @Expose()
  expYear?: number;
}
