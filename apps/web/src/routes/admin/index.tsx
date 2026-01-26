import type { MetaFunction } from "react-router";

import { AdminDashboardPage } from "@/pages/admin/Dashboard";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Admin Dashboard" },
    {
      name: "description",
      content:
        "Display the admin dashboard to manage your orders, notifications, and other settings.",
    },
  ];
};

export default function Index() {
  return <AdminDashboardPage />;
}
