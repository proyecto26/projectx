import type { MetaFunction } from "react-router";

import { ProductDetail } from "@/pages/ProductDetail";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Product Detail" },
    { name: "description", content: "View the details of a product." },
  ];
};

export default function Index() {
  return <ProductDetail />;
}
