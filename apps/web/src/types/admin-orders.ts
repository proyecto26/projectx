/**
 * Admin Order Types
 * These types match the backend DTOs in apps/order/src/app/order/dto/
 */

export interface AdminStatsDto {
  totalRevenue: number;
  averageOrderValue: number;
  pendingOrders: number;
  pendingPercentage: number;
  completedOrders: number;
  totalCustomers: number;
  conversionRate: number;
  avgDeliveryTime?: number;
}

export interface AdminOrderListItemDto {
  id: number;
  referenceId: string;
  customerName: string;
  customerEmail: string;
  type: string;
  status:
    | "Pending"
    | "Confirmed"
    | "Shipped"
    | "Delivered"
    | "Cancelled"
    | "Failed";
  amount: number;
  date: Date;
}

export interface AdminOrderListResponseDto {
  orders: AdminOrderListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminOrderCountsDto {
  total: number;
  pending: number;
  inProduction: number;
  completed: number;
}

export interface AdminOrderDetailDto {
  id: number;
  referenceId: string;
  status:
    | "Pending"
    | "Confirmed"
    | "Shipped"
    | "Delivered"
    | "Cancelled"
    | "Failed";
  totalPrice: number;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  createdAt: Date;
  updatedAt: Date;
  shippingAddress?: string;
  items: Array<{
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  customer: {
    email: string;
    firstName?: string;
    lastName?: string;
  };
  payment?: {
    status: string;
    amount: number;
    provider: string;
    transactionId?: string;
    paymentMethod?: string;
    billingAddress?: string;
  };
}

export interface AdminOrderListQueryDto {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}
