import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import { transformToLowerCase } from "../transforms";

export class AuthLoginDto {
  @ApiProperty({ description: "Email address for the user" })
  @IsEmail()
  @IsNotEmpty()
  @Expose()
  @MaxLength(100)
  @Transform(({ value }) => transformToLowerCase(value))
  @IsString()
  email!: string;
}

export class AuthVerifyDto extends AuthLoginDto {
  @ApiProperty({ description: "Code sent to the user" })
  @IsNotEmpty()
  @Expose()
  @Min(0)
  @Max(999999)
  @IsInt()
  code!: number;
}
