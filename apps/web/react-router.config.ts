import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  appDirectory: "src",
  allowedActionOrigins: [
    "localhost:3000",
    "*.use2.devtunnels.ms/", // Wildcards are supported in some versions/patterns
  ],
} satisfies Config;
