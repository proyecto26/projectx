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

export const loader = async ({ request }: Route.LoaderArgs) => {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;

  try {
    const [productsRes, categoriesRes] = await Promise.all([
      axios.get<{ products: ProductDto[]; total: number }>(
        `${productAPIUrl}/product`,
        {
          params: { category, search, limit: 12 },
          timeout: 5000,
        },
      ),
      axios.get<string[]>(`${productAPIUrl}/product/categories`, {
        timeout: 5000,
      }),
    ]);
    return {
      products: productsRes.data.products,
      total: productsRes.data.total,
      categories: categoriesRes.data,
      initialCategory: category,
      initialSearch: search,
    };
  } catch (error) {
    console.error(
      "Marketplace loader error:",
      error instanceof Error ? error.message : error,
    );
    return {
      products: [],
      total: 0,
      categories: [],
      initialCategory: category,
      initialSearch: search,
    };
  }
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const {
    products: initialProducts,
    categories,
    initialCategory,
    initialSearch,
  } = loaderData;

  const safeProducts = Array.isArray(initialProducts) ? initialProducts : [];
  const { data: productsData } = useProducts({
    initialData: safeProducts.map((product: ProductDto) => ({
      ...product,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    })) as ProductDto[],
    category: initialCategory,
    search: initialSearch,
  });

  const products = productsData?.pages
    ? productsData.pages.flatMap((p) => p.products ?? [])
    : (initialProducts ?? []);

  return (
    <MarketplacePage
      products={products}
      categories={categories ?? []}
      initialCategory={initialCategory}
      initialSearch={initialSearch}
    />
  );
}
