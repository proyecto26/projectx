import { Outlet, useRouteLoaderData } from "react-router";

import PageLayout from "../../pages/PageLayout";
import { loader } from "../../root";

export default function Layout() {
  const data = useRouteLoaderData<typeof loader>('root');
  const { user, isAuthenticated } = data ?? {};
  return (
    <PageLayout
      email={user?.email}
      isAuthenticated={isAuthenticated}
    >
      <Outlet />
    </PageLayout>
  );
}
