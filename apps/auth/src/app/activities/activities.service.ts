import { Inject, Injectable, Logger } from "@nestjs/common";
import { compareValue, hashValue } from "@projectx/core";
import { EmailService } from "@projectx/email";
import type { UserDto } from "@projectx/models";

import { UserService } from "../user/user.service";

function generateRandomSixDigitNumber(): number {
  return Math.floor(Math.random() * 1000000);
}

@Injectable()
export class ActivitiesService {
  readonly logger = new Logger(ActivitiesService.name);
  constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  async sendLoginEmail(email: string) {
    const code = generateRandomSixDigitNumber();
    const textCode = code.toString().padStart(6, "0");
    this.logger.log(`sendLoginEmail(${email}) - code generated: ${textCode}`);
    await this.emailService.sendLoginEmail(
      {
        token: textCode,
        userName: email.split("@")[0] as string,
      },
      email,
    );

    return await hashValue(textCode);
  }

  async verifyLoginCode(email: string, code: number, hashedCode: string) {
    let user: UserDto | undefined;
    const isValid = await compareValue(
      code.toString().padStart(6, "0"),
      hashedCode,
    );
    if (isValid) {
      user = await this.userService.getOrCreate(email);
    }
    return user;
  }
}
