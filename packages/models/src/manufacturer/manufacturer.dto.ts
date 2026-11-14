import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
} from "class-validator";

import { transformToDate, trimTransform } from "../transforms";
import { NoProfanity } from "../validators";

export enum ManufacturerStatus {
  Active = "Active",
  Inactive = "Inactive",
  Deleted = "Suspended",
  Suspended = "UnderReview",
}

export class ManufacturerDto {
  constructor(partial?: Partial<ManufacturerDto>) {
    Object.assign(this, partial);
  }

  @ApiProperty({ description: "Unique identifier for the manufacturer" })
  @IsInt()
  @IsDefined()
  @Expose()
  id!: number;

  @ApiProperty({ description: "Name of the manufacturer" })
  @IsDefined()
  @IsString()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  name!: string;

  @ApiProperty({ description: "Status of the manufacturer" })
  @IsDefined()
  @IsEnum(ManufacturerStatus, {
    message: "Status must be one of the defined enum values.",
  })
  @Expose()
  status!: ManufacturerStatus;

  @ApiProperty({ description: "Date the manufacturer was created" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  createdAt!: Date;

  @ApiProperty({ description: "Date the manufacturer was last updated" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  updatedAt!: Date;
}
