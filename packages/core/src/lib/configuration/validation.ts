import { type ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

/**
 * Validate the configuration object against the environment variables class.
 * It's used with the ConfigModule.forRoot() method.
 * @param config - The configuration object to validate.
 * @param envVariablesClass - The environment variables class to validate against.
 * @returns The validated configuration object.
 */
export function validateConfiguration<T>(
  config: Record<string, unknown>,
  envVariablesClass: ClassConstructor<T>,
): T {
  const validatedConfig = plainToInstance(envVariablesClass, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig as object, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
