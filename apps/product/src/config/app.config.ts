import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: Number(process.env.PRODUCT_PORT) || 8083,
  environment: process.env.NODE_ENV,
  apiPrefix: "product",
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") ?? [],
  logLevel: process.env.LOG_LEVEL ?? "info",
  jwtSecret: process.env.JWT_SECRET,
}));
