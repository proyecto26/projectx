import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

const passportModule = PassportModule.register({});

@Module({
  imports: [
    passportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get("app.jwtSecret"),
        signOptions: { expiresIn: "12 days", algorithm: "HS256" },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtAuthGuard, JwtStrategy, AuthService],
  exports: [AuthService, passportModule],
})
export class AuthModule {}
