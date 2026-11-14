import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  appDirectory: "src",
  allowedActionOrigins: [
    "localhost:3000",
    "*.use2.devtunnels.ms", // Host patterns only: no scheme or trailing slash
  ],
} satisfies Config;
