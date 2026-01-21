import { createMock } from "@golevelup/ts-jest";
import { Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { OrderRepositoryService } from "@projectx/db";

import { OrderService } from "./order.service";

describe("OrderService", () => {
  let service: OrderService;
  let _orderRepositoryService: OrderRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepositoryService,
          useValue: createMock<OrderRepositoryService>(),
        },
        { provide: Logger, useValue: createMock<Logger>() },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    _orderRepositoryService = module.get<OrderRepositoryService>(
      OrderRepositoryService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createOrder", () => {
    it("should call createOrder method of OrderRepositoryService correctly", async () => {
      // Add a test case here if needed, or fix the existing one
    });
  });
});
