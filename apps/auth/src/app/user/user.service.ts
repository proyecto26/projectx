import { Inject, Injectable, Logger } from "@nestjs/common";
import type { AuthUser } from "@projectx/core";
import { UserRepositoryService } from "@projectx/db";
import type { UpdateUserDto } from "@projectx/models";

@Injectable()
export class UserService {
  readonly logger = new Logger(UserService.name);
  constructor(
    @Inject(UserRepositoryService)
    private readonly userService: UserRepositoryService,
  ) {}

  findOne(user: AuthUser) {
    this.logger.log(`findOne(${user.id})`, user);
    return this.userService.findOneByEmail(user.email);
  }

  getOrCreate(...params: Parameters<typeof this.userService.getOrCreate>) {
    return this.userService.getOrCreate(...params);
  }

  updateProfile(userId: number, data: UpdateUserDto) {
    this.logger.log(`updateProfile(${userId})`);
    return this.userService.updateUser(userId, data);
  }
}
