/**
 * Admin Order API Service
 * Client-side and server-side functions for admin order operations
 */

import axios from "axios";
import type {
  AdminOrderCountsDto,
  AdminOrderDetailDto,
  AdminOrderListQueryDto,
  AdminOrderListResponseDto,
  AdminStatsDto,
} from "../types/admin-orders";

/**
 * Client-side functions (use window.ENV.ORDER_API_URL)
 */

export async function getAdminStats(
  accessToken: string,
): Promise<AdminStatsDto> {
  const response = await axios.get<AdminStatsDto>(
    `${window.ENV.ORDER_API_URL}/order/orders/admin/stats`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getAdminOrderList(
  accessToken: string,
  query: AdminOrderListQueryDto,
): Promise<AdminOrderListResponseDto> {
  const params = new URLSearchParams();
  if (query.status) params.append("status", query.status);
  if (query.search) params.append("search", query.search);
  if (query.page) params.append("page", query.page.toString());
  if (query.limit) params.append("limit", query.limit.toString());

  const response = await axios.get<AdminOrderListResponseDto>(
    `${window.ENV.ORDER_API_URL}/order/orders/admin/list?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getAdminOrderCounts(
  accessToken: string,
): Promise<AdminOrderCountsDto> {
  const response = await axios.get<AdminOrderCountsDto>(
    `${window.ENV.ORDER_API_URL}/order/orders/admin/counts`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getAdminOrderDetail(
  accessToken: string,
  id: number,
): Promise<AdminOrderDetailDto> {
  const response = await axios.get<AdminOrderDetailDto>(
    `${window.ENV.ORDER_API_URL}/order/orders/admin/${id}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function updateOrderStatus(
  accessToken: string,
  id: number,
  status: string,
): Promise<AdminOrderDetailDto> {
  const response = await axios.patch<AdminOrderDetailDto>(
    `${window.ENV.ORDER_API_URL}/order/orders/admin/${id}/status`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function cancelAdminOrder(
  accessToken: string,
  id: number,
): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    `${window.ENV.ORDER_API_URL}/order/orders/admin/${id}/cancel`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

/**
 * Server-side functions (accept baseUrl parameter for use in loaders)
 */

export async function getAdminStatsServer(
  baseUrl: string,
  accessToken: string,
): Promise<AdminStatsDto> {
  const response = await axios.get<AdminStatsDto>(
    `${baseUrl}/order/orders/admin/stats`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getAdminOrderListServer(
  baseUrl: string,
  accessToken: string,
  query: AdminOrderListQueryDto,
): Promise<AdminOrderListResponseDto> {
  const params = new URLSearchParams();
  if (query.status) params.append("status", query.status);
  if (query.search) params.append("search", query.search);
  if (query.page) params.append("page", query.page.toString());
  if (query.limit) params.append("limit", query.limit.toString());

  const response = await axios.get<AdminOrderListResponseDto>(
    `${baseUrl}/order/orders/admin/list?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getAdminOrderCountsServer(
  baseUrl: string,
  accessToken: string,
): Promise<AdminOrderCountsDto> {
  const response = await axios.get<AdminOrderCountsDto>(
    `${baseUrl}/order/orders/admin/counts`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function getAdminOrderDetailServer(
  baseUrl: string,
  accessToken: string,
  id: number,
): Promise<AdminOrderDetailDto> {
  const response = await axios.get<AdminOrderDetailDto>(
    `${baseUrl}/order/orders/admin/${id}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function updateOrderStatusServer(
  baseUrl: string,
  accessToken: string,
  id: number,
  status: string,
): Promise<AdminOrderDetailDto> {
  const response = await axios.patch<AdminOrderDetailDto>(
    `${baseUrl}/order/orders/admin/${id}/status`,
    { status },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}

export async function cancelAdminOrderServer(
  baseUrl: string,
  accessToken: string,
  id: number,
): Promise<{ message: string }> {
  const response = await axios.post<{ message: string }>(
    `${baseUrl}/order/orders/admin/${id}/cancel`,
    {},
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  return response.data;
}
