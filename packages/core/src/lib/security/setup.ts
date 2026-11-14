import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export function setupAppSecurity(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const allowedOrigins = configService.get("app.allowedOrigins");

  // Allow local development origins for development environment only
  if (configService.get("app.environment") === "development") {
    allowedOrigins.push("http://localhost");
    allowedOrigins.push("http://127.0.0.1");
  }

  // Set security-related HTTP headers
  app.use(helmet());

  // Enable Cross-origin resource sharing for a list of domains
  app.enableCors({
    origin: (
      origin: string,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (
        !origin ||
        allowedOrigins.some((allowedOrigin: string) =>
          origin.startsWith(allowedOrigin),
        )
      ) {
        callback(null, true);
      } else {
        callback(new Error(`enableCors(${origin}) not allowed by CORS`));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
    credentials: true,
  });

  // Limit repeated requests for brute-force attacks
  app.use(
    rateLimit({
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 1000, // limit each IP to 1000 requests per windowMs
      message:
        "Too many requests from this IP, please try again after 5 minutes",
    }),
  );
}
