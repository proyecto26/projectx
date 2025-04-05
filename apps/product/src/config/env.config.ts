import { Environment } from '@projectx/models';
import {
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsInt,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsDefined()
  NODE_ENV!: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsDefined()
  PRODUCT_PORT!: number;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;
}
