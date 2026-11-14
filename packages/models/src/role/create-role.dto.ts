import { OmitType } from "@nestjs/swagger";

import { RoleDto } from "./role.dto";

export class CreateRoleDto extends OmitType(RoleDto, [
  "id",
  "createdAt",
  "updatedAt",
] as const) {}
