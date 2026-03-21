import type { ProductDto } from "@projectx/models";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const PRODUCT_QUERY_KEY = "product";

export const useProduct = (id: number | string, initialData?: ProductDto) => {
  return useQuery<ProductDto>({
    queryKey: [PRODUCT_QUERY_KEY, id],
    queryFn: async () => {
      const response = await axios.get<ProductDto>(
        `${window.ENV.PRODUCT_API_URL}/product/${id}`,
      );
      return response.data;
    },
    initialData,
    enabled: !!id,
  });
};
