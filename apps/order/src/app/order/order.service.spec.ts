import { createMock } from "@golevelup/ts-jest";
import { Logger } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  OrderRepositoryService,
  PaymentRepositoryService,
  PrismaService,
} from "@projectx/db";
import { StripeService } from "@projectx/payment";

import { OrderService } from "./order.service";

describe("OrderService", () => {
  let service: OrderService;
  let moduleRef: TestingModule;
  let _orderRepositoryService: OrderRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: OrderRepositoryService,
          useValue: createMock<OrderRepositoryService>(),
        },
        {
          provide: PaymentRepositoryService,
          useValue: createMock<PaymentRepositoryService>(),
        },
        {
          provide: StripeService,
          useValue: createMock<StripeService>(),
        },
        {
          provide: PrismaService,
          useValue: createMock<PrismaService>(),
        },
        { provide: Logger, useValue: createMock<Logger>() },
      ],
    }).compile();

    moduleRef = module;
    service = module.get<OrderService>(OrderService);
    _orderRepositoryService = module.get<OrderRepositoryService>(
      OrderRepositoryService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("cancelPayment", () => {
    const stripeOf = () => module_get<StripeService>(StripeService);
    const module_get = <T>(token: new (...args: never[]) => T) =>
      moduleRef.get<T>(token);
    const withOrder = (transactionId?: string) =>
      jest
        .spyOn(
          module_get<OrderRepositoryService>(OrderRepositoryService),
          "getOrderByReferenceId",
        )
        .mockResolvedValue({ payment: { transactionId } } as never);
    const intentsSay = (...statuses: string[]) => {
      const spy = jest.spyOn(stripeOf(), "getPaymentIntent");
      for (const status of statuses) {
        spy.mockResolvedValueOnce({ status } as never);
      }
    };

    it.each([
      ["succeeded", "paid"],
      ["processing", "processing"],
      ["canceled", "cancelled"],
    ])("doesn't cancel an intent that is %s", async (status, outcome) => {
      withOrder("pi");
      intentsSay(status);
      const cancel = jest.spyOn(stripeOf(), "cancelPaymentIntent");
      await expect(service.cancelPayment("ref")).resolves.toBe(outcome);
      expect(cancel).not.toHaveBeenCalled();
    });

    it("cancels an intent that can still be paid", async () => {
      withOrder("pi");
      intentsSay("requires_payment_method");
      const cancel = jest
        .spyOn(stripeOf(), "cancelPaymentIntent")
        .mockResolvedValue({} as never);
      await expect(service.cancelPayment("ref")).resolves.toBe("cancelled");
      expect(cancel).toHaveBeenCalledWith("pi");
    });

    it("reports a payment that arrived while cancelling", async () => {
      withOrder("pi");
      intentsSay("requires_payment_method", "succeeded");
      jest
        .spyOn(stripeOf(), "cancelPaymentIntent")
        .mockRejectedValue(new Error("Already succeeded"));
      await expect(service.cancelPayment("ref")).resolves.toBe("paid");
    });

    it("lets the activity retry other failures", async () => {
      withOrder("pi");
      intentsSay("requires_payment_method", "requires_payment_method");
      jest
        .spyOn(stripeOf(), "cancelPaymentIntent")
        .mockRejectedValue(new Error("Network"));
      await expect(service.cancelPayment("ref")).rejects.toThrow("Network");
    });

    it("has nothing to cancel without a payment", async () => {
      withOrder(undefined);
      await expect(service.cancelPayment("ref")).resolves.toBe("cancelled");
    });
  });

  describe("createOrder", () => {
    it("should call createOrder method of OrderRepositoryService correctly", async () => {
      // Add a test case here if needed, or fix the existing one
    });
  });
});
