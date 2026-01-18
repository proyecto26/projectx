import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { AuthPayload } from "@projectx/models";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthUser } from "../user";

/**
 * JwtStrategy is passport JWT strategy.
 *
 * @export
 * @class JwtStrategy
 * @extends {PassportStrategy(Strategy)}
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@Inject(ConfigService) configService: ConfigService) {
    const secretOrKey = configService.get<string>("app.jwtSecret");
    if (!secretOrKey) {
      throw new Error("JWT secret is not defined");
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  /**
   * validate returns jwt payload.
   * @param payload - Payload with the info of the user
   *
   * @returns
   * @memberof JwtStrategy
   */
  async validate(payload: AuthPayload) {
    return {
      id: Number(payload.sub),
      email: payload.email,
      username: payload.username,
    } as AuthUser;
  }
}
