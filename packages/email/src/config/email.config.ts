import { registerAs } from "@nestjs/config";

export default registerAs("email", () => ({
  apiKey: process.env.SENDGRID_API_KEY ?? "",
  fromEmail: process.env.EMAIL_FROM ?? "",
  fromName: process.env.EMAIL_FROM_NAME ?? "",
}));
