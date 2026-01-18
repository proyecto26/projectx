import { Environment } from "@projectx/models";
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from "class-validator";

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsDefined()
  NODE_ENV!: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsDefined()
  AUTH_PORT!: number;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SENDGRID_API_KEY!: string;
}
