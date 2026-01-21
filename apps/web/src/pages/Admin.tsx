import {
  Bell,
  ChevronDown,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";

const orders = [
  {
    id: "#192541",
    customer: "Esther Howard",
    type: "Shipping",
    status: "Paid",
    amount: "$3,127.00",
    date: "Jun 19",
  },
  {
    id: "#192540",
    customer: "David Miller",
    type: "Pickup",
    status: "Paid",
    amount: "$1,890.00",
    date: "Jun 19",
  },
  {
    id: "#192539",
    customer: "James Moore",
    type: "Shipping",
    status: "Paid",
    amount: "$2,456.00",
    date: "Jun 18",
  },
  {
    id: "#192538",
    customer: "Robert Anderson",
    type: "Shipping",
    status: "Pending",
    amount: "$1,789.00",
    date: "Jun 18",
  },
];

export function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-gray-200 border-r bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="p-6">
          <h1 className="font-bold text-2xl text-gray-800 dark:text-gray-100">
            Admin
          </h1>
        </div>
        <nav className="mt-2">
          {[
            { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
            { icon: Package, label: "Orders", id: "orders" },
            { icon: Settings, label: "Settings", id: "settings" },
            { icon: Bell, label: "Notifications", id: "notifications" },
            { icon: HelpCircle, label: "Help & Support", id: "help" },
          ].map(({ icon: Icon, label, id }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex w-full items-center px-6 py-3 text-sm ${
                activeTab === id
                  ? "border-blue-600 border-r-2 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900 dark:text-blue-400"
                  : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 border-gray-200 border-t p-4 dark:border-gray-700">
          <div className="flex items-center">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="Profile"
              className="h-8 w-8 rounded-full"
            />
            <div className="ml-3">
              <p className="font-medium text-gray-700 text-sm dark:text-gray-200">
                Tom Cook
              </p>
              <p className="text-gray-500 text-xs dark:text-gray-400">
                View Profile
              </p>
            </div>
            <LogOut className="ml-auto h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <header className="border-gray-200 border-b bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  className="rounded-lg border border-gray-300 bg-white py-2 pr-4 pl-10 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Import
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-sm text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="font-medium text-gray-500 text-sm dark:text-gray-400">
                Total Revenue
              </h3>
              <p className="mt-2 font-bold text-2xl text-gray-900 dark:text-gray-100">
                $2.2M
              </p>
              <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                242 orders
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="font-medium text-gray-500 text-sm dark:text-gray-400">
                Average Order
              </h3>
              <p className="mt-2 font-bold text-2xl text-gray-900 dark:text-gray-100">
                $2,246.75
              </p>
              <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                +12.3% from last month
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="font-medium text-gray-500 text-sm dark:text-gray-400">
                Pending Orders
              </h3>
              <p className="mt-2 font-bold text-2xl text-gray-900 dark:text-gray-100">
                0.32%
              </p>
              <p className="mt-1 text-gray-600 text-sm dark:text-gray-400">
                8 orders pending
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow-sm dark:bg-gray-800">
            <div className="border-gray-200 border-b p-6 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-gray-900 text-lg dark:text-gray-100">
                  Recent Orders
                </h2>
                <button
                  type="button"
                  className="flex items-center text-gray-600 text-sm dark:text-gray-400"
                >
                  All filters
                  <ChevronDown className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900 text-sm dark:text-gray-100">
                        {order.id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm dark:text-gray-300">
                        {order.customer}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm dark:text-gray-300">
                        {order.type}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${
                            order.status === "Paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm dark:text-gray-300">
                        {order.amount}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm dark:text-gray-300">
                        {order.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
