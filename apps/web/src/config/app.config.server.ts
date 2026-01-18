import type { Environment } from "@projectx/models";

import { getRequiredServerEnvVar } from "./utils.server";

export const environment = getRequiredServerEnvVar<Environment>("NODE_ENV");
export const sessionSecret = getRequiredServerEnvVar(
  "SESSION_SECRET",
  "MY_SECRET_KEY",
);
export const stripePublishableKey = getRequiredServerEnvVar(
  "STRIPE_PUBLISHABLE_KEY",
);
export const authAPIUrl = getRequiredServerEnvVar(
  "AUTH_API_URL",
  "http://localhost:8081",
);
export const orderAPIUrl = getRequiredServerEnvVar(
  "ORDER_API_URL",
  "http://localhost:8082",
);
export const productAPIUrl = getRequiredServerEnvVar(
  "PRODUCT_API_URL",
  "http://localhost:8083",
);
