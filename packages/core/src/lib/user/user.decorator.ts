import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";

import type { AuthUser } from "./user.interface";

export const AuthenticatedUser = createParamDecorator(
  (data: keyof AuthUser, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUser;
    if (!user) {
      throw new UnauthorizedException();
    }
    return data ? user[data] : user;
  },
);
