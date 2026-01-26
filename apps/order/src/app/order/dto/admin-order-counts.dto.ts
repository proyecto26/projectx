import { ApiProperty } from "@nestjs/swagger";
import { IsInt } from "class-validator";

export class AdminOrderCountsDto {
  @ApiProperty({ description: "Total number of orders" })
  @IsInt()
  total!: number;

  @ApiProperty({ description: "Number of pending orders" })
  @IsInt()
  pending!: number;

  @ApiProperty({
    description: "Number of orders in production (Confirmed + Shipped)",
  })
  @IsInt()
  inProduction!: number;

  @ApiProperty({ description: "Number of completed (delivered) orders" })
  @IsInt()
  completed!: number;
}
