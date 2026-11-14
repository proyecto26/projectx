import { OmitType, PartialType } from "@nestjs/swagger";

import { RoleDto } from "./role.dto";

export class UpdateRoleDto extends PartialType(
  OmitType(RoleDto, ["createdAt", "updatedAt"] as const),
) {}
