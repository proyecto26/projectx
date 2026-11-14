import {
  authAPIUrl,
  environment,
  orderAPIUrl,
  productAPIUrl,
  stripePublishableKey,
} from "./app.config.server";

export function getEnv() {
  return {
    NODE_ENV: environment,
    AUTH_API_URL: authAPIUrl,
    ORDER_API_URL: orderAPIUrl,
    PRODUCT_API_URL: productAPIUrl,
    STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
  };
}

export type ENV = ReturnType<typeof getEnv>;

declare global {
  // eslint-disable-next-line no-var
  var ENV: ReturnType<typeof getEnv>;
  interface window {
    ENV: ENV;
  }
}
