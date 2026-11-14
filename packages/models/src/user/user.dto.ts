import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsDate,
  IsDefined,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

import {
  transformToDate,
  transformToLowerCase,
  trimTransform,
} from "../transforms";
import { NoProfanity } from "../validators";

export enum UserStatus {
  Active = "Active",
  Inactive = "Inactive",
  Deleted = "Deleted",
  Suspended = "Suspended",
}

export class UserDto {
  constructor(partial?: Partial<UserDto>) {
    Object.assign(this, partial);
  }

  @ApiProperty({ description: "Unique identifier for the user" })
  @IsInt()
  @IsDefined()
  @Expose()
  id!: number;

  @ApiProperty({ description: "Username for the user" })
  @IsString()
  @Expose()
  @MaxLength(60)
  @Transform(({ value }) => trimTransform(value))
  @Matches(/^\S*$/, { message: "Username cannot contain spaces." })
  @Matches(/^[a-z0-9._-]+$/, {
    message: "Username must contain only lowercase letters, numbers, and dots.",
  })
  @NoProfanity()
  @IsOptional()
  username?: string;

  @ApiProperty({ description: "Email address for the user" })
  @IsDefined()
  @IsString()
  @IsEmail()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => transformToLowerCase(value))
  email!: string;

  @ApiProperty({ description: "Status of the user" })
  @IsEnum(UserStatus, {
    message: "Status must be one of the defined enum values.",
  })
  @Expose()
  status!: UserStatus;

  @ApiProperty({ description: "First name of the user" })
  @IsString()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: "Last name of the user" })
  @IsString()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: "Primary street address of the user" })
  @IsString()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  addressLine1?: string;

  @ApiProperty({ description: `Second line of the user's address` })
  @IsString()
  @Expose()
  @MaxLength(50)
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ description: `City of the user's address` })
  @IsString()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  city?: string;

  @ApiProperty({ description: `State of the user's address` })
  @IsString()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  state?: string;

  @ApiProperty({ description: `Postal code of the user's address` })
  @IsString()
  @Expose()
  @MaxLength(10)
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: `Country of the user's address` })
  @IsString()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  country?: string;

  @ApiProperty({ description: "Phone number of the user" })
  @IsString()
  @Expose()
  @Transform(({ value }) => trimTransform(value))
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ description: "Date the user was created" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  createdAt!: Date;

  @ApiProperty({ description: "Date the user was last updated" })
  @IsDefined()
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  updatedAt!: Date;

  @ApiProperty({ description: "Date the user was deleted" })
  @IsDate()
  @Expose()
  @Transform(({ value }) => transformToDate(value))
  deletedAt?: Date;
}
