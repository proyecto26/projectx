import type { MetaFunction } from "react-router";
import { orderAPIUrl } from "@/config/app.config.server";
import { getAccessTokenOrRedirect } from "@/cookies/auth.server";
import { AdminOrdersPage } from "@/pages/admin/Orders";
import {
  getAdminOrderCountsServer,
  getAdminOrderListServer,
  getAdminStatsServer,
} from "@/services/admin-orders";
import type { Route } from "./+types/orders";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Orders Management" },
    {
      name: "description",
      content:
        "Manage and track all customer orders, view order details, and update order statuses.",
    },
  ];
};

export const loader = async ({ request }: Route.LoaderArgs) => {
  const accessToken = await getAccessTokenOrRedirect(request);

  // Get URL search params for filtering
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const page = Number(url.searchParams.get("page")) || 1;
  const limit = Number(url.searchParams.get("limit")) || 10;

  try {
    // Fetch all data in parallel
    const [stats, counts, orderList] = await Promise.all([
      getAdminStatsServer(orderAPIUrl, accessToken),
      getAdminOrderCountsServer(orderAPIUrl, accessToken),
      getAdminOrderListServer(orderAPIUrl, accessToken, {
        status,
        search,
        page,
        limit,
      }),
    ]);

    return {
      stats,
      counts,
      orderList,
      query: { status, search, page, limit },
    };
  } catch (error) {
    console.error("Error loading admin orders:", error);
    // Return empty data on error so page can still render
    return {
      stats: null,
      counts: null,
      orderList: null,
      query: { status, search, page, limit },
    };
  }
};

export default function Orders({ loaderData }: Route.ComponentProps) {
  return (
    <AdminOrdersPage
      initialStats={loaderData.stats}
      initialCounts={loaderData.counts}
      initialOrderList={loaderData.orderList}
      initialQuery={loaderData.query}
    />
  );
}
