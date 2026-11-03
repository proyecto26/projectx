import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers/auth";
import {
  cancelAdminOrder,
  getAdminOrderCounts,
  getAdminOrderDetail,
  getAdminOrderList,
  getAdminStats,
  updateOrderStatus,
} from "../services/admin-orders";
import type {
  AdminOrderCountsDto,
  AdminOrderDetailDto,
  AdminOrderListQueryDto,
  AdminOrderListResponseDto,
  AdminStatsDto,
} from "../types/admin-orders";

const MAX_RETRY_ATTEMPTS = 3;

// Query keys for cache management
export const ADMIN_ORDERS_KEYS = {
  all: ["admin-orders"] as const,
  stats: () => [...ADMIN_ORDERS_KEYS.all, "stats"] as const,
  counts: () => [...ADMIN_ORDERS_KEYS.all, "counts"] as const,
  list: (query?: AdminOrderListQueryDto) =>
    [...ADMIN_ORDERS_KEYS.all, "list", query] as const,
  detail: (id: number) => [...ADMIN_ORDERS_KEYS.all, "detail", id] as const,
};

/**
 * Hook to fetch admin dashboard statistics
 */
export const useAdminStats = (initialData?: AdminStatsDto) => {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.stats(),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Access token is required");
      }
      return getAdminStats(accessToken);
    },
    enabled: !!accessToken,
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount <= MAX_RETRY_ATTEMPTS,
    staleTime: 30_000, // 30 seconds
    ...(initialData && { initialData }),
  });
};

/**
 * Hook to fetch admin order counts by status
 */
export const useAdminOrderCounts = (initialData?: AdminOrderCountsDto) => {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.counts(),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Access token is required");
      }
      return getAdminOrderCounts(accessToken);
    },
    enabled: !!accessToken,
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount <= MAX_RETRY_ATTEMPTS,
    staleTime: 30_000, // 30 seconds
    ...(initialData && { initialData }),
  });
};

/**
 * Hook to fetch admin order list with filtering and pagination
 */
export const useAdminOrderList = (
  query: AdminOrderListQueryDto = {},
  initialData?: AdminOrderListResponseDto,
) => {
  const { accessToken } = useAuth();

  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.list(query),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Access token is required");
      }
      return getAdminOrderList(accessToken, query);
    },
    enabled: !!accessToken,
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount <= MAX_RETRY_ATTEMPTS,
    staleTime: 30_000, // 30 seconds
    ...(initialData && { initialData }),
  });
};

/**
 * Hook to fetch admin order detail
 */
export const useAdminOrderDetail = (
  id: number,
  options?: { enabled?: boolean; initialData?: AdminOrderDetailDto },
) => {
  const { accessToken } = useAuth();
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.detail(id),
    queryFn: async () => {
      if (!accessToken) {
        throw new Error("Access token is required");
      }
      return getAdminOrderDetail(accessToken, id);
    },
    enabled: !!accessToken && enabled,
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount <= MAX_RETRY_ATTEMPTS,
    staleTime: 30_000, // 30 seconds
    ...(options?.initialData && { initialData: options.initialData }),
  });
};

/**
 * Hook to update order status
 */
export const useUpdateOrderStatus = () => {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number;
      status: string;
    }): Promise<AdminOrderDetailDto> => {
      if (!accessToken) {
        throw new Error("Access token is required");
      }
      return updateOrderStatus(accessToken, id, status);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch order list to show updated status
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.list(),
      });

      // Update the specific order detail cache
      queryClient.setQueryData(ADMIN_ORDERS_KEYS.detail(variables.id), data);

      // Invalidate counts to update statistics
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.counts(),
      });

      // Invalidate stats to update dashboard
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.stats(),
      });
    },
  });
};

/**
 * Hook to cancel an order
 */
export const useCancelOrder = () => {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ message: string }> => {
      if (!accessToken) {
        throw new Error("Access token is required");
      }
      return cancelAdminOrder(accessToken, id);
    },
    onSuccess: (_data, id) => {
      // Invalidate order list to remove or update the cancelled order
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.list(),
      });

      // Invalidate the specific order detail
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.detail(id),
      });

      // Invalidate counts to update statistics
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.counts(),
      });

      // Invalidate stats to update dashboard
      queryClient.invalidateQueries({
        queryKey: ADMIN_ORDERS_KEYS.stats(),
      });
    },
  });
};
