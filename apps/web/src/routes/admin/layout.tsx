import { type LoaderFunction, Outlet, useRouteLoaderData } from "react-router";

import { getAccessTokenOrRedirect } from "@/cookies/auth.server";
import PageLayout from "@/pages/PageLayout";
import type { loader as rootLoader } from "../../root";

export const loader: LoaderFunction = async ({ request }) => {
  await getAccessTokenOrRedirect(request);
  return null;
};

export default function AdminLayout() {
  const data = useRouteLoaderData<typeof rootLoader>("root");
  const { user, isAuthenticated } = data ?? {};
  return (
    <PageLayout email={user?.email} isAuthenticated={isAuthenticated}>
      <Outlet />
    </PageLayout>
  );
}
