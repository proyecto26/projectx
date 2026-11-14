import { registerAs } from "@nestjs/config";

export default registerAs("swagger", () => ({
  title: "Product API",
  description: "Provides the endpoints for product management",
  version: "1.0",
}));
