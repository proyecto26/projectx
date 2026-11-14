import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { trimTransform } from "../transforms";
import { NoProfanity } from "../validators";

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "Username for the user" })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  @Transform(({ value }) => trimTransform(value))
  @Matches(/^\S*$/, { message: "Username cannot contain spaces." })
  @Matches(/^[a-z0-9._-]+$/, {
    message: "Username must contain only lowercase letters, numbers, and dots.",
  })
  @NoProfanity()
  username?: string;

  @ApiPropertyOptional({ description: "First name of the user" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  firstName?: string;

  @ApiPropertyOptional({ description: "Last name of the user" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  @NoProfanity()
  lastName?: string;

  @ApiPropertyOptional({ description: "Phone number of the user" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  phoneNumber?: string;

  @ApiPropertyOptional({ description: "Primary street address of the user" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Transform(({ value }) => trimTransform(value))
  addressLine1?: string;

  @ApiPropertyOptional({ description: "Second line of the user's address" })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  @Transform(({ value }) => trimTransform(value))
  addressLine2?: string;

  @ApiPropertyOptional({ description: "City of the user's address" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => trimTransform(value))
  city?: string;

  @ApiPropertyOptional({ description: "State of the user's address" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => trimTransform(value))
  state?: string;

  @ApiPropertyOptional({ description: "Postal code of the user's address" })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  @Transform(({ value }) => trimTransform(value))
  postalCode?: string;

  @ApiPropertyOptional({ description: "Country of the user's address" })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => trimTransform(value))
  country?: string;
}
