import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsDefined, IsInt } from "class-validator";

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
}
