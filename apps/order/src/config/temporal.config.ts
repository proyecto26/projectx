import { registerAs } from "@nestjs/config";

export default registerAs("temporal", () => ({
  host: process.env.TEMPORAL_HOST,
  namespace: process.env.TEMPORAL_NAMESPACE || "default",
  taskQueue: "order",
}));
