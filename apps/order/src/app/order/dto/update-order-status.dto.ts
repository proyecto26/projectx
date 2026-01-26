import { ApiProperty } from "@nestjs/swagger";
import { OrderStatus } from "@projectx/models";
import { IsEnum } from "class-validator";

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description: "New order status",
    example: OrderStatus.Confirmed,
  })
  @IsEnum(OrderStatus, {
    message: `Status must be one of: ${Object.values(OrderStatus).join(", ")}`,
  })
  status!: OrderStatus;
}
