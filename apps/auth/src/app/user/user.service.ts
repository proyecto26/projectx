import { Injectable, Logger } from "@nestjs/common";
import type { AuthUser } from "@projectx/core";
import type { UserRepositoryService } from "@projectx/db";

@Injectable()
export class UserService {
  readonly logger = new Logger(UserService.name);
  constructor(private readonly userService: UserRepositoryService) {}

  findOne(user: AuthUser) {
    this.logger.log(`findOne(${user.id})`, user);
    return this.userService.findOneByEmail(user.email);
  }

  getOrCreate(...params: Parameters<typeof this.userService.getOrCreate>) {
    return this.userService.getOrCreate(...params);
  }
}
