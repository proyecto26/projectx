import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { paymentConfig } from "../config";
import { StripeService } from "./stripe/stripe.service";

@Module({
  imports: [ConfigModule.forFeature(paymentConfig)],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentModule {}
