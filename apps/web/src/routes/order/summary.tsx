import type { LoaderFunction, MetaFunction } from "react-router";
import { getAccessTokenOrRedirect } from "@/cookies/auth.server";
import OrderSummary from "@/pages/OrderSummary";
import { authRequest } from "@/services/http.server";
import type { OrderDto } from "@projectx/models";
import { orderAPIUrl } from "@/config/app.config.server";
import invariant from "tiny-invariant";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Order Summary" },
    { name: "description", content: "View your order summary." },
  ];
};

const ORDER_API = `${orderAPIUrl}/order`;

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params?.orderId, "orderId is required");
  const { orderId } = params;
  const order = await authRequest<OrderDto>(request, `${ORDER_API}/${orderId}`);
  return { order };
};

export default function Index() {
  return <OrderSummary />;
}
