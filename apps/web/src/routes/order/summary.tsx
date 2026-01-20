import type { OrderSummaryDto } from "@projectx/models";
import type { LoaderFunction, MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import invariant from "tiny-invariant";
import { orderAPIUrl } from "@/config/app.config.server";
import { getAccessTokenOrRedirect } from "@/cookies/auth.server";
import OrderSummary from "@/pages/OrderSummary";
import { authRequest } from "@/services/http.server";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Order Summary" },
    { name: "description", content: "View your order summary." },
  ];
};

const ORDER_API = `${orderAPIUrl}/order`;

export const loader: LoaderFunction = async ({ request, params }) => {
  await getAccessTokenOrRedirect(request);
  invariant(params?.orderId, "orderId is required");
  const { orderId } = params;
  const order = await authRequest<OrderSummaryDto>(
    request,
    `${ORDER_API}/summary/${orderId}`,
  );
  return { order };
};

export default function Index() {
  const { order } = useLoaderData() as { order: OrderSummaryDto };
  return <OrderSummary order={order} />;
}
