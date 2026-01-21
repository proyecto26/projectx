import { Inject, Injectable, Logger } from "@nestjs/common";
import { type CreateUserDto, UserDto, UserStatus } from "@projectx/models";
import { plainToInstance } from "class-transformer";

import { PrismaService } from "../prisma.service";

@Injectable()
export class UserRepositoryService {
  private logger = new Logger(UserRepositoryService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findAll() {
    this.logger.verbose("findAll()");
    return this.prisma.user.findMany();
  }

  async createUser(data: CreateUserDto): Promise<UserDto> {
    this.logger.verbose(`createUser(${data.email})`);
    const user = await this.prisma.user.create({
      data,
    });
    const userDto = plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
    return userDto;
  }

  async findOneByEmail(email: string): Promise<UserDto | null> {
    this.logger.verbose(`findOneByEmail(${email})`);
    const user = await this.prisma.user.findFirst({
      where: { email },
    });
    if (!user) {
      return null;
    }
    return plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async getOrCreate(email: string) {
    let user = await this.findOneByEmail(email);
    if (!user) {
      const newUser: CreateUserDto = {
        email,
        status: UserStatus.Active,
      };
      user = await this.createUser(newUser);
    }
    return user;
  }
}
