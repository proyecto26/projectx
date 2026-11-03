import { createMock } from "@golevelup/ts-jest";
import { Test, type TestingModule } from "@nestjs/testing";
import { OrderService } from "./order.service";
import { OrderAdminController } from "./order-admin.controller";

describe("OrderAdminController", () => {
  let controller: OrderAdminController;
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderAdminController],
      providers: [
        { provide: OrderService, useValue: createMock<OrderService>() },
      ],
    }).compile();

    controller = module.get<OrderAdminController>(OrderAdminController);
    service = module.get(OrderService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe("getStats", () => {
    it("should return admin dashboard statistics", async () => {
      const mockStats = {
        totalRevenue: 10000,
        averageOrderValue: 50,
        pendingOrders: 10,
        pendingPercentage: 20,
        completedOrders: 40,
        totalCustomers: 100,
        conversionRate: 80,
        avgDeliveryTime: 24,
      };

      jest.spyOn(service, "getAdminStats").mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(service.getAdminStats).toHaveBeenCalled();
    });
  });

  describe("getOrderList", () => {
    it("should return paginated list of orders", async () => {
      const mockResponse = {
        orders: [
          {
            id: 1,
            referenceId: "ref-123",
            customerName: "John Doe",
            customerEmail: "john@example.com",
            type: "Standard",
            status: "Pending",
            amount: 100,
            date: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, "getAdminOrderList").mockResolvedValue(mockResponse);

      const query = { page: 1, limit: 10 };
      const result = await controller.getOrderList(query);

      expect(result).toEqual(mockResponse);
      expect(service.getAdminOrderList).toHaveBeenCalledWith(query);
    });

    it("should handle filtering by status", async () => {
      const mockResponse = {
        orders: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      jest.spyOn(service, "getAdminOrderList").mockResolvedValue(mockResponse);

      const query = { status: "Pending", page: 1, limit: 10 };
      const result = await controller.getOrderList(query);

      expect(result).toEqual(mockResponse);
      expect(service.getAdminOrderList).toHaveBeenCalledWith(query);
    });
  });

  describe("getOrderCounts", () => {
    it("should return order counts by status", async () => {
      const mockCounts = {
        total: 100,
        pending: 20,
        inProduction: 30,
        completed: 50,
      };

      jest.spyOn(service, "getAdminOrderCounts").mockResolvedValue(mockCounts);

      const result = await controller.getOrderCounts();

      expect(result).toEqual(mockCounts);
      expect(service.getAdminOrderCounts).toHaveBeenCalled();
    });
  });
});
