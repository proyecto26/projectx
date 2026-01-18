import { createMock } from "@golevelup/ts-jest";
import { Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import type { AuthUser } from "@projectx/core";
import { UserRepositoryService } from "@projectx/db";

import { UserService } from "./order.service";

describe("UserService", () => {
  let service: UserService;
  let userRepositoryService: UserRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepositoryService,
          useValue: createMock<UserRepositoryService>(),
        },
        { provide: Logger, useValue: createMock<Logger>() },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepositoryService = module.get<UserRepositoryService>(
      UserRepositoryService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findOne", () => {
    it("should call findOneByEmail method of UserRepositoryService correctly", async () => {
      const mockUser: AuthUser = { email: "test@test.com", id: 1 } as AuthUser;
      await service.findOne(mockUser);

      expect(userRepositoryService.findOneByEmail).toHaveBeenCalledWith(
        mockUser.email,
      );
    });
  });
});
