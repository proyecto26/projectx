import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional } from "class-validator";

export class AdminStatsDto {
  @ApiProperty({ description: "Total revenue from all orders" })
  @IsNumber()
  totalRevenue!: number;

  @ApiProperty({ description: "Average order value" })
  @IsNumber()
  averageOrderValue!: number;

  @ApiProperty({ description: "Number of pending orders" })
  @IsNumber()
  pendingOrders!: number;

  @ApiProperty({ description: "Percentage of pending orders" })
  @IsNumber()
  pendingPercentage!: number;

  @ApiProperty({ description: "Number of completed orders" })
  @IsNumber()
  completedOrders!: number;

  @ApiProperty({ description: "Total number of unique customers" })
  @IsNumber()
  totalCustomers!: number;

  @ApiProperty({
    description: "Conversion rate (completed orders / total orders)",
  })
  @IsNumber()
  conversionRate!: number;

  @ApiProperty({
    description: "Average delivery time in hours",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  avgDeliveryTime?: number;
}
