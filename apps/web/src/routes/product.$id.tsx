import type { ProductDto } from "@projectx/models";
import axios from "axios";

import { productAPIUrl } from "@/config/app.config.server";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import type { Route } from "./+types/product.$id";

export const meta: Route.MetaFunction = ({ data }) => {
  const title =
    (data as { product?: { name?: string } })?.product?.name ??
    "Product Detail";
  return [
    { title: `ProjectX - ${title}` },
    { name: "description", content: `View details for ${title}` },
  ];
};

export const loader = async ({ params }: Route.LoaderArgs) => {
  const { id } = params;
  try {
    const [productRes, relatedRes] = await Promise.all([
      axios.get<ProductDto>(`${productAPIUrl}/product/${id}`, {
        timeout: 5000,
      }),
      axios.get<{ products: ProductDto[]; total: number }>(
        `${productAPIUrl}/product`,
        {
          params: { limit: 5 },
          timeout: 5000,
        },
      ),
    ]);
    // Filter out the current product from related and take up to 4
    const related = relatedRes.data.products
      .filter((p) => p.id !== productRes.data.id)
      .slice(0, 4);
    return { product: productRes.data, relatedProducts: related };
  } catch (error) {
    console.error(
      "Product detail loader error:",
      error instanceof Error ? error.message : error,
    );
    throw new Response("Product not found", { status: 404 });
  }
};

export default function ProductDetailRoute({
  loaderData,
}: Route.ComponentProps) {
  const { product, relatedProducts } = loaderData;
  return (
    <ProductDetailPage
      product={
        {
          ...product,
          createdAt: new Date(product.createdAt),
          updatedAt: new Date(product.updatedAt),
        } as ProductDto
      }
      relatedProducts={
        relatedProducts.map((p: ProductDto) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        })) as ProductDto[]
      }
    />
  );
}
