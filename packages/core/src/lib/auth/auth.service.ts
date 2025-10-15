import { Injectable, Logger } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import type { UserDto } from "@projectx/models";

@Injectable()
export class AuthService {
  readonly logger = new Logger(AuthService.name);
  constructor(private readonly jwtService: JwtService) {}

  async createAccessToken(user: UserDto) {
    this.logger.log(`createAccessToken(${user.email}) - creating token`);
    return await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
  }
}
