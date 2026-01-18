import { Outlet, useRouteLoaderData } from "react-router";

import PageLayout from "../../pages/PageLayout";
import type { loader } from "../../root";

export default function Layout() {
  const data = useRouteLoaderData<typeof loader>("root");
  const { user, isAuthenticated } = data ?? {};
  return (
    <PageLayout
      email={user?.email}
      isAuthenticated={isAuthenticated}
      title="ProjectX"
      containerClassName="test flex justify-center items-center"
      className="bg-gradient-to-b from-purple-600 to-indigo-700 dark:from-gray-900 dark:to-gray-800"
    >
      <Outlet />
    </PageLayout>
  );
}
