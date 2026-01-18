import { Environment } from "@projectx/models";

function getRequiredEnvVarFromObj<T>(
  obj: Record<string, string | undefined>,
  key: string,
  devValue: unknown = `${key}-dev-value`,
) {
  let value = devValue;
  const envVal = obj[key];
  if (envVal) {
    value = envVal;
  } else if (obj.ENVIRONMENT !== Environment.Development) {
    throw new Error(`${key} is a required env variable`);
  }
  return value as T;
}

export function getRequiredServerEnvVar<T = string>(
  key: string,
  devValue?: unknown,
) {
  return getRequiredEnvVarFromObj<T>(process.env, key, devValue);
}
