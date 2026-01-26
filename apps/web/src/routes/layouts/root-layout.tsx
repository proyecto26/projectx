import { Outlet, useRouteLoaderData } from "react-router";

import PageLayout from "../../pages/PageLayout";
import type { loader } from "../../root";

export default function RootLayout() {
  const data = useRouteLoaderData<typeof loader>("root");
  const { user, isAuthenticated } = data ?? {};
  return (
    <PageLayout email={user?.email} isAuthenticated={isAuthenticated}>
      <Outlet />
    </PageLayout>
  );
}
