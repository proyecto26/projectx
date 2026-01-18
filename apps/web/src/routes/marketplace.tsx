import type { ProductDto } from "@projectx/models";
import axios from "axios";
import type { MetaFunction } from "react-router";
import { productAPIUrl } from "@/config/app.config.server";
import { useProducts } from "@/hooks/useProducts";
import { MarketplacePage } from "@/pages/MarketplacePage";
import type { Route } from "./+types/marketplace";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Marketplace" },
    {
      name: "description",
      content:
        "Browse our wide selection of products in our online marketplace.",
    },
  ];
};

export const loader = async () => {
  try {
    const response = await axios.get<ProductDto[]>(`${productAPIUrl}/product`, {
      timeout: 5000,
    });
    return {
      products: response.data,
    };
  } catch (error) {
    console.error(error);
    return {
      products: [],
    };
  }
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const { products: initialProducts } = loaderData;
  const { data: products } = useProducts({
    initialData: initialProducts?.map((product: ProductDto) => ({
      ...product,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    })) as ProductDto[],
  });
  return (
    <MarketplacePage products={products?.pages ? products?.pages[0] : []} />
  );
}
