import { useQuery } from "@tanstack/react-query";
import axios from "axios";

const CATEGORIES_QUERY_KEY = "categories";

export const useCategories = () => {
  return useQuery<string[]>({
    queryKey: [CATEGORIES_QUERY_KEY],
    queryFn: async () => {
      const response = await axios.get<string[]>(
        `${window.ENV.PRODUCT_API_URL}/product/categories`,
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // categories don't change often
  });
};
