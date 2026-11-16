import { Environment } from "@projectx/models";
import {
  IsDefined,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  type ValidationArguments,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from "class-validator";

/**
 * The catalog is a demo: orders are never made or shipped. A live Stripe key
 * would charge real cards for them, so it needs ALLOW_LIVE_PAYMENTS=true.
 */
// errors.toString() only prints this name, so it says what to do
@ValidatorConstraint({ name: "noLiveKeyWithoutAllowLivePayments" })
export class TestModeStripeKey implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    const { ALLOW_LIVE_PAYMENTS } = args.object as EnvironmentVariables;
    return (
      ALLOW_LIVE_PAYMENTS === "true" ||
      typeof value !== "string" ||
      !value.startsWith("sk_live_")
    );
  }

  defaultMessage() {
    return "STRIPE_SECRET_KEY is a live key. The demo catalog only takes test payments; set ALLOW_LIVE_PAYMENTS=true once orders can be fulfilled.";
  }
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsDefined()
  NODE_ENV!: Environment;

  @IsInt()
  @Min(0)
  @Max(65535)
  @IsDefined()
  ORDER_PORT!: number;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @Validate(TestModeStripeKey)
  STRIPE_SECRET_KEY!: string;

  @IsOptional()
  @IsIn(["true", "false"])
  ALLOW_LIVE_PAYMENTS?: string;

  @IsString()
  @IsNotEmpty()
  STRIPE_WEBHOOK_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  SENDGRID_API_KEY!: string;
}
