import type { LoaderFunction, MetaFunction } from "react-router";

import { getAccessTokenOrRedirect } from "@/cookies/auth.server";
import { OrderPage } from "@/pages/Order";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Order Detail" },
    {
      name: "description",
      content: "View the details of your order and manage your order settings.",
    },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await getAccessTokenOrRedirect(request);
  return {};
};

export default function Index() {
  return <OrderPage />;
}
