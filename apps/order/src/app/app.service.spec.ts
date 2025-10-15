import { createMock } from "@golevelup/ts-jest";
import { Test } from "@nestjs/testing";
import { OrderRepositoryService } from "@projectx/db";

import { AppService } from "./app.service";

describe("AppService", () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: OrderRepositoryService,
          useValue: createMock<OrderRepositoryService>(),
        },
      ],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  describe("findAll", () => {
    it("should return something", () => {
      expect(service.findAll()).toBeDefined();
    });
  });
});
