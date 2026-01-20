import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsNumber } from "class-validator";
import { OrderDto } from "./order.dto";

export class OrderSummaryDto extends OrderDto {
  constructor(partial?: Partial<OrderSummaryDto>) {
    super(partial);
    Object.assign(this, partial);
  }

  @ApiProperty({ description: "Subtotal of the order" })
  @IsNumber()
  @Expose()
  subtotal!: number;
}
