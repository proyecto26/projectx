import { registerAs } from "@nestjs/config";

export default registerAs("swagger", () => ({
  title: "Auth API",
  description: "Provides the endpoints for authentication",
  version: "1.0",
}));
