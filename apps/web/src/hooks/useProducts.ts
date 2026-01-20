import type { ProductDto } from "@projectx/models";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";

const PRODUCTS_QUERY_KEY = "products";
const MAX_RETRY_ATTEMPTS = 3;

export const useProducts = ({
  initialData = [] as ProductDto[],
  size = 10,
}) => {
  return useInfiniteQuery<ProductDto[]>({
    queryKey: [PRODUCTS_QUERY_KEY],
    queryFn: async ({ pageParam = 1 }) => {
      // TODO: Use limit and offset to load more products from the endpoint
      const response = await axios.get<ProductDto[]>(
        `${window.ENV.PRODUCT_API_URL}/product`,
      );
      return response.data;
    },
    enabled: true,
    refetchOnWindowFocus: true,
    retry: (failureCount) => failureCount <= MAX_RETRY_ATTEMPTS,
    getNextPageParam: (lastPage: ProductDto[], pages: ProductDto[][]) => {
      if (lastPage.length === size) {
        return pages.length + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...(!!initialData?.length && {
      initialData: {
        pages: [initialData],
        pageParams: [null],
      },
    }),
  });
};
