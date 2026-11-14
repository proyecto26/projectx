import { OmitType, PartialType } from "@nestjs/swagger";

import { OrderDto } from "./order.dto";

export class UpdateOrderDto extends PartialType(
  OmitType(OrderDto, [
    "userId",
    "status",
    "totalPrice",
    "createdAt",
    "updatedAt",
  ] as const),
) {}
