import type { ProductDto } from "@projectx/models";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";

const PRODUCTS_QUERY_KEY = "products";
const MAX_RETRY_ATTEMPTS = 3;

type ProductsResponse = {
  products: ProductDto[];
  total: number;
};

export const useProducts = ({
  initialData = [] as ProductDto[],
  category,
  search,
  size = 12,
}: {
  initialData?: ProductDto[];
  category?: string;
  search?: string;
  size?: number;
}) => {
  return useInfiniteQuery<ProductsResponse>({
    queryKey: [PRODUCTS_QUERY_KEY, category, search],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set("page", String(pageParam));
      params.set("limit", String(size));
      if (category) params.set("category", category);
      if (search) params.set("search", search);

      const baseUrl =
        typeof window !== "undefined"
          ? window.ENV.PRODUCT_API_URL
          : "http://localhost:8083";

      const response = await axios.get<ProductsResponse>(
        `${baseUrl}/product?${params.toString()}`,
      );
      return response.data;
    },
    enabled: typeof window !== "undefined",
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount <= MAX_RETRY_ATTEMPTS,
    getNextPageParam: (lastPage, pages) => {
      const loadedCount = pages.reduce((sum, p) => sum + p.products.length, 0);
      if (loadedCount < lastPage.total) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...(!!initialData?.length && {
      initialData: {
        pages: [{ products: initialData, total: initialData.length }],
        pageParams: [null],
      },
    }),
  });
};
