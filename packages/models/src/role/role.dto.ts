import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { trimTransform } from "../transforms";

export class RoleDto {
  constructor(partial?: Partial<RoleDto>) {
    Object.assign(this, partial);
  }

  @ApiProperty({ description: "Unique identifier for the role" })
  @IsInt()
  @IsDefined()
  @Expose()
  id!: number;

  @ApiProperty({ description: "Name of the role" })
  @IsString()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  name!: string;

  @ApiProperty({ description: "Description of the role" })
  @IsString()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  description?: string;

  @ApiProperty({ description: "Date the role was created" })
  @IsDefined()
  @IsDate()
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: "Date the role was last updated" })
  @IsDefined()
  @IsDate()
  @Expose()
  updatedAt!: Date;
}
