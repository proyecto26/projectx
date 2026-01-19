import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticatedUser, type AuthUser, JwtAuthGuard } from "@projectx/core";
import { UserDto, UserStatus } from "@projectx/models";

import { UserService } from "./user.service";

@ApiBearerAuth()
@ApiTags("User")
@UseGuards(JwtAuthGuard)
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOperation({
    summary: "Get user profile",
    description: "This endpoint allow a user to get their profile",
  })
  @ApiOkResponse({
    description: "The user profile was retrieved successfully",
    type: UserDto,
  })
  @ApiForbiddenResponse({
    description: "The user is not authenticated",
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  async getProfile(@AuthenticatedUser() userDto: AuthUser) {
    const user = await this.userService.findOne(userDto);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    if (user.status !== UserStatus.Active) {
      throw new ForbiddenException(
        "User is not active in the system, status: " + user.status,
      );
    }
    return user;
  }
}
