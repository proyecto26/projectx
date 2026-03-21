import type { LoaderFunction, MetaFunction } from "react-router";

import { getAccessTokenOrRedirect } from "@/cookies/auth.server";
import { OrderConfirmationPage } from "@/pages/OrderConfirmation";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Order Confirmed" },
    {
      name: "description",
      content: "Your order has been confirmed successfully.",
    },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await getAccessTokenOrRedirect(request);
  return null;
};

export default function OrderConfirmation() {
  return <OrderConfirmationPage />;
}
