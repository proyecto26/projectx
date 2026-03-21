import type { BadgeVariant } from "@projectx/ui";
import { Badge, MetricCard, SearchBar } from "@projectx/ui";
import {
  Bell,
  Clock,
  Download,
  Edit,
  Eye,
  Filter,
  LayoutDashboard,
  LogOut,
  MoreVertical,
  Package,
  PieChart,
  Printer,
  RotateCcw,
  Settings,
  ShoppingCart,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import {
  useAdminOrderCounts,
  useAdminOrderDetail,
  useAdminOrderList,
  useAdminStats,
  useCancelOrder,
  useUpdateOrderStatus,
} from "../../hooks/useAdminOrders";
import type {
  AdminOrderCountsDto,
  AdminOrderListItemDto,
  AdminOrderListResponseDto,
  AdminStatsDto,
} from "../../types/admin-orders";

// Props interface for initial SSR data
interface AdminOrdersPageProps {
  initialStats?: AdminStatsDto | null;
  initialCounts?: AdminOrderCountsDto | null;
  initialOrderList?: AdminOrderListResponseDto | null;
  initialQuery?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  };
}

function getStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "Delivered":
      return "success";
    case "Shipped":
      return "info";
    case "Confirmed":
      return "warning";
    case "Pending":
      return "warning";
    case "Cancelled":
      return "error";
    case "Failed":
      return "error";
    default:
      return "info";
  }
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Format date
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminOrdersPage({
  initialStats = null,
  initialCounts = null,
  initialOrderList = null,
  initialQuery = {},
}: AdminOrdersPageProps = {}) {
  // Local state for filters and pagination
  const [statusFilter, setStatusFilter] = useState(
    initialQuery?.status || "all",
  );
  const [searchQuery, setSearchQuery] = useState(initialQuery?.search || "");
  const [currentPage, setCurrentPage] = useState(initialQuery?.page || 1);
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  const tabs = [
    { label: "All", value: "all" },
    { label: "Pending", value: "Pending" },
    { label: "Processing", value: "Confirmed" },
    { label: "Shipped", value: "Shipped" },
    { label: "Delivered", value: "Delivered" },
    { label: "Cancelled", value: "Cancelled" },
  ];

  // React Query hooks with initial data
  const { data: stats, isLoading: statsLoading } = useAdminStats(
    initialStats || undefined,
  );

  const { data: counts, isLoading: countsLoading } = useAdminOrderCounts(
    initialCounts || undefined,
  );

  const { data: orderListData, isLoading: ordersLoading } = useAdminOrderList(
    {
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
      page: currentPage,
      limit: 10,
    },
    initialOrderList || undefined,
  );

  const { data: orderDetail, isLoading: orderDetailLoading } =
    useAdminOrderDetail(viewingOrderId || 0, {
      enabled: viewingOrderId !== null,
    });

  const updateStatusMutation = useUpdateOrderStatus();
  const cancelOrderMutation = useCancelOrder();

  // Computed values
  const orders = orderListData?.orders || [];
  const totalOrders = orderListData?.total || 0;
  const totalPages = Math.ceil(totalOrders / 10);

  // Calculate fulfillment rate
  const fulfillmentRate =
    counts && counts.total > 0
      ? ((counts.completed / counts.total) * 100).toFixed(1)
      : "0.0";

  // Calculate avg production time in days
  const avgProductionTime = stats?.avgDeliveryTime
    ? (stats.avgDeliveryTime / 24).toFixed(1)
    : "-";

  // Handle status filter
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
    setSelectedOrders([]);
  };

  // Handle search (debounced in a real implementation)
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setSelectedOrders([]);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedOrders([]);
  };

  // Handle update status
  const handleUpdateStatus = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  // Handle cancel order
  const handleCancelOrder = (orderId: number) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      cancelOrderMutation.mutate(orderId);
    }
  };

  // Handle view details
  const handleViewDetails = (orderId: number) => {
    setViewingOrderId(orderId);
  };

  // Handle close details modal
  const handleCloseDetails = () => {
    setViewingOrderId(null);
  };

  // Handle print label
  const handlePrintLabel = (order: AdminOrderListItemDto) => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shipping Label - ${order.referenceId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .label { border: 2px solid #000; padding: 20px; max-width: 400px; }
              .header { font-size: 18px; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #000; padding-bottom: 10px; }
              .row { margin: 8px 0; }
              .row-label { font-weight: bold; display: inline-block; width: 80px; }
              .barcode { font-family: monospace; font-size: 24px; letter-spacing: 3px; margin-top: 15px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="header">SHIPPING LABEL</div>
              <div class="row"><span class="row-label">Order:</span> ${order.referenceId}</div>
              <div class="row"><span class="row-label">To:</span> ${order.customerName}</div>
              <div class="row"><span class="row-label">Email:</span> ${order.customerEmail}</div>
              <div class="row"><span class="row-label">Date:</span> ${formatDate(order.date)}</div>
              <div class="row"><span class="row-label">Amount:</span> ${formatCurrency(order.amount)}</div>
              <div class="barcode">*${order.referenceId.slice(0, 8).toUpperCase()}*</div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Toggle select all orders
  const toggleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((order) => order.id));
    }
  };

  // Toggle select single order
  const toggleSelectOrder = (orderId: number) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter((id) => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  return (
    <div className="flex h-screen bg-base-300">
      {/* Sidebar */}
      <aside className="hidden w-[280px] flex-col border-base-300 border-r bg-base-100 lg:flex">
        {/* Brand */}
        <div className="border-base-300 border-b p-6">
          <h1 className="font-bold font-mono text-2xl text-base-content">
            ProjectX
          </h1>
          <p className="mt-1 text-base-content/60 text-xs">
            E-Commerce Dashboard
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          {/* Main Section */}
          <div className="mb-6">
            <h3 className="mb-3 px-6 font-semibold text-base-content/50 text-xs uppercase tracking-wider">
              Main
            </h3>
            <Link
              to="/admin"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-medium text-sm">Dashboard</span>
            </Link>
            <Link
              to="/admin/orders"
              className="flex w-full items-center gap-3 border-primary border-r-2 bg-primary/10 px-6 py-3 text-primary"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium text-sm">Orders</span>
              {counts && counts.pending > 0 && (
                <Badge
                  variant="count"
                  count={counts.pending}
                  className="ml-auto"
                />
              )}
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Package className="h-5 w-5" />
              <span className="font-medium text-sm">Products</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Users className="h-5 w-5" />
              <span className="font-medium text-sm">Customers</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <PieChart className="h-5 w-5" />
              <span className="font-medium text-sm">Analytics</span>
            </button>
          </div>

          {/* System Section */}
          <div>
            <h3 className="mb-3 px-6 font-semibold text-base-content/50 text-xs uppercase tracking-wider">
              System
            </h3>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium text-sm">Settings</span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <Bell className="h-5 w-5" />
              <span className="font-medium text-sm">Notifications</span>
              <Badge variant="count" count={5} className="ml-auto" />
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="border-base-300 border-t p-4">
          <div className="flex items-center gap-3">
            <div className="avatar">
              <div className="w-10 rounded-full">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="Admin User"
                />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-base-content text-sm">
                Tom Cook
              </p>
              <p className="truncate text-base-content/60 text-xs">
                admin@projectx.com
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-base-300 border-b bg-base-100 px-4 py-4 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-bold font-mono text-[22px] text-base-content lg:text-2xl">
                Orders
              </h1>
              <p className="mt-1 text-[13px] text-base-content/60 lg:text-sm">
                Manage customer orders
              </p>
            </div>

            <div className="flex gap-2">
              <button type="button" className="btn btn-sm btn-outline gap-2">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button type="button" className="btn btn-sm btn-primary gap-2">
                <Filter className="h-4 w-4" />
                New Order
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 space-y-4 overflow-auto p-4 lg:space-y-6 lg:p-8">
          {/* Stats Cards - desktop only */}
          {statsLoading || countsLoading ? (
            <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="card animate-pulse bg-base-100 shadow-sm"
                >
                  <div className="card-body p-5">
                    <div className="h-10 w-10 rounded-lg bg-base-300" />
                    <div className="mt-3 h-4 w-20 rounded bg-base-300" />
                    <div className="mt-1 h-8 w-16 rounded bg-base-300" />
                    <div className="mt-2 h-3 w-24 rounded bg-base-300" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4">
              <MetricCard
                icon={ShoppingCart}
                label="Total Orders"
                value={(counts?.total || 0).toLocaleString()}
                trendLabel="All time orders"
              />
              <MetricCard
                icon={Clock}
                label="Pending"
                value={(counts?.pending || 0).toString()}
                trendLabel="Needs attention"
              />
              <MetricCard
                icon={Package}
                label="In Production"
                value={(counts?.inProduction || 0).toString()}
                trendLabel="Being processed"
              />
              <MetricCard
                icon={TrendingUp}
                label="Completed"
                value={(counts?.completed || 0).toLocaleString()}
                trendLabel="Successfully delivered"
              />
            </div>
          )}

          {/* Performance Metrics - desktop only */}
          {statsLoading ? (
            <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="card animate-pulse bg-base-100 shadow-sm"
                >
                  <div className="card-body p-5">
                    <div className="h-10 w-10 rounded-lg bg-base-300" />
                    <div className="mt-3 h-4 w-20 rounded bg-base-300" />
                    <div className="mt-1 h-8 w-16 rounded bg-base-300" />
                    <div className="mt-2 h-3 w-24 rounded bg-base-300" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="hidden grid-cols-1 gap-4 sm:grid-cols-2 lg:grid lg:grid-cols-4">
              <MetricCard
                icon={TrendingUp}
                label="Fulfillment Rate"
                value={`${fulfillmentRate}%`}
                trendLabel="Last 30 days"
              />
              <MetricCard
                icon={Clock}
                label="Avg Production Time"
                value={`${avgProductionTime} days`}
                trendLabel="Order to delivery"
              />
              <MetricCard
                icon={RotateCcw}
                label="Total Revenue"
                value={formatCurrency(stats?.totalRevenue || 0)}
                trendLabel="All time"
              />
              <MetricCard
                icon={Star}
                label="Avg Order Value"
                value={formatCurrency(stats?.averageOrderValue || 0)}
                trendLabel="Per order"
              />
            </div>
          )}

          {/* Orders Table */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-0">
              {/* Table Header */}
              <div className="border-base-300 border-b p-4 lg:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold text-base-content text-lg">
                      All Orders
                    </h3>
                    {!ordersLoading && (
                      <Badge variant="count" count={totalOrders} />
                    )}
                  </div>

                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <SearchBar
                      placeholder="Search orders..."
                      value={searchQuery}
                      onChange={handleSearch}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Tabs - horizontally scrollable on mobile */}
                <div className="scrollbar-none mt-4 flex gap-2 overflow-x-auto pb-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`btn btn-sm flex-shrink-0 ${
                        statusFilter === tab.value ? "btn-primary" : "btn-ghost"
                      }`}
                      onClick={() => handleStatusFilter(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Bulk Actions */}
                {selectedOrders.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-primary/10 p-3">
                    <span className="font-medium text-primary text-sm">
                      {selectedOrders.length} selected
                    </span>
                    <div className="divider divider-horizontal m-0" />
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      <Printer className="h-3 w-3" />
                      Print Labels
                    </button>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Update Status
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Order Cards - visible on mobile only */}
              <div className="lg:hidden">
                {ordersLoading ? (
                  <div className="p-8 text-center">
                    <span className="loading loading-spinner loading-lg" />
                    <p className="mt-4 text-base-content/60">
                      Loading orders...
                    </p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-base-content/60">No orders found</p>
                    {searchQuery && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost mt-4"
                        onClick={() => handleSearch("")}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-4">
                    {orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        className="w-full space-y-3 rounded-lg border border-base-300 bg-base-100 p-4 text-left transition-colors hover:bg-base-200"
                        onClick={() => handleViewDetails(order.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-base-content/60 text-sm">
                            #{order.referenceId}
                          </span>
                          <Badge
                            variant={getStatusBadgeVariant(order.status)}
                            label={order.status}
                          />
                        </div>
                        <p className="font-medium text-sm">
                          {order.customerName}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-base-content/50">
                            {formatDate(order.date)}
                          </span>
                          <span className="font-bold">
                            {formatCurrency(order.amount)}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Mobile Pagination footer */}
                {!ordersLoading && orders.length > 0 && (
                  <div className="border-base-300 border-t p-4 text-center">
                    <p className="text-[12px] text-base-content/60">
                      Showing {(currentPage - 1) * 10 + 1}-
                      {Math.min(currentPage * 10, totalOrders)} of {totalOrders}{" "}
                      orders
                    </p>
                    <div className="join mt-3">
                      <button
                        type="button"
                        className="join-item btn btn-sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        «
                      </button>
                      <button
                        type="button"
                        className="join-item btn btn-sm btn-disabled pointer-events-none"
                      >
                        {currentPage} / {totalPages}
                      </button>
                      <button
                        type="button"
                        className="join-item btn btn-sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Table - hidden on mobile */}
              <div className="hidden overflow-x-auto lg:block">
                {ordersLoading ? (
                  <div className="p-8 text-center">
                    <span className="loading loading-spinner loading-lg" />
                    <p className="mt-4 text-base-content/60">
                      Loading orders...
                    </p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-base-content/60">No orders found</p>
                    {searchQuery && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost mt-4"
                        onClick={() => handleSearch("")}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr className="border-base-300 border-b">
                        <th>
                          <label>
                            <input
                              type="checkbox"
                              className="checkbox checkbox-sm"
                              checked={
                                orders.length > 0 &&
                                selectedOrders.length === orders.length
                              }
                              onChange={toggleSelectAll}
                            />
                          </label>
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Order ID
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Type
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Customer
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Status
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Amount
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Date
                        </th>
                        <th className="font-semibold text-xs uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="hover">
                          <th>
                            <label>
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={selectedOrders.includes(order.id)}
                                onChange={() => toggleSelectOrder(order.id)}
                              />
                            </label>
                          </th>
                          <td>
                            <span className="font-mono font-semibold text-sm">
                              {order.referenceId}
                            </span>
                          </td>
                          <td>
                            <span className="text-sm">{order.type}</span>
                          </td>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {order.customerName}
                              </span>
                              <span className="text-base-content/60 text-xs">
                                {order.customerEmail}
                              </span>
                            </div>
                          </td>
                          <td>
                            <Badge
                              variant={getStatusBadgeVariant(order.status)}
                              label={order.status}
                            />
                          </td>
                          <td>
                            <span className="font-mono font-semibold text-sm">
                              {formatCurrency(order.amount)}
                            </span>
                          </td>
                          <td>
                            <span className="text-base-content/60 text-sm">
                              {formatDate(order.date)}
                            </span>
                          </td>
                          <td>
                            <div className="dropdown dropdown-end">
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm btn-square"
                                aria-label="Actions"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              <ul className="dropdown-content menu z-10 w-52 rounded-box bg-base-100 p-2 shadow-lg">
                                <li>
                                  <button
                                    type="button"
                                    onClick={() => handleViewDetails(order.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </button>
                                </li>
                                <li>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleUpdateStatus(order.id, "Shipped")
                                    }
                                    disabled={
                                      order.status === "Delivered" ||
                                      order.status === "Shipped" ||
                                      order.status === "Cancelled"
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                    Mark as Shipped
                                  </button>
                                </li>
                                <li>
                                  <button
                                    type="button"
                                    onClick={() => handlePrintLabel(order)}
                                  >
                                    <Printer className="h-4 w-4" />
                                    Print Label
                                  </button>
                                </li>
                                <li>
                                  <button
                                    type="button"
                                    className="text-error"
                                    onClick={() => handleCancelOrder(order.id)}
                                    disabled={
                                      order.status === "Delivered" ||
                                      order.status === "Cancelled"
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Cancel Order
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Desktop Pagination */}
              {!ordersLoading && orders.length > 0 && (
                <div className="hidden border-base-300 border-t p-5 lg:block">
                  <div className="flex items-center justify-between">
                    <span className="text-base-content/60 text-sm">
                      Showing {(currentPage - 1) * 10 + 1} to{" "}
                      {Math.min(currentPage * 10, totalOrders)} of {totalOrders}{" "}
                      orders
                    </span>
                    <div className="join">
                      <button
                        type="button"
                        className="join-item btn btn-sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        «
                      </button>
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              className={`join-item btn btn-sm ${
                                currentPage === pageNum ? "btn-active" : ""
                              }`}
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <>
                          <button
                            type="button"
                            className="join-item btn btn-sm btn-disabled"
                          >
                            ...
                          </button>
                          <button
                            type="button"
                            className="join-item btn btn-sm"
                            onClick={() => handlePageChange(totalPages)}
                          >
                            {totalPages}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="join-item btn btn-sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        »
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Order Details Modal */}
      {viewingOrderId !== null && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost absolute top-2 right-2"
              onClick={handleCloseDetails}
            >
              ✕
            </button>
            <h3 className="mb-4 font-bold text-lg">Order Details</h3>

            {orderDetailLoading ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : orderDetail ? (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-base-content/60 text-sm">Order ID</p>
                    <p className="font-mono font-semibold">
                      {orderDetail.referenceId}
                    </p>
                  </div>
                  <div>
                    <p className="text-base-content/60 text-sm">Status</p>
                    <Badge
                      variant={getStatusBadgeVariant(orderDetail.status)}
                      label={orderDetail.status}
                    />
                  </div>
                  <div>
                    <p className="text-base-content/60 text-sm">Created</p>
                    <p>{formatDate(orderDetail.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-base-content/60 text-sm">Last Updated</p>
                    <p>{formatDate(orderDetail.updatedAt)}</p>
                  </div>
                </div>

                <div className="divider" />

                {/* Customer Info */}
                <div>
                  <h4 className="mb-2 font-semibold">Customer</h4>
                  <div className="rounded-lg bg-base-200 p-4">
                    <p className="font-medium">
                      {orderDetail.customer.firstName}{" "}
                      {orderDetail.customer.lastName}
                    </p>
                    <p className="text-base-content/60 text-sm">
                      {orderDetail.customer.email}
                    </p>
                    {orderDetail.shippingAddress && (
                      <p className="mt-2 whitespace-pre-line text-sm">
                        {orderDetail.shippingAddress}
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="mb-2 font-semibold">Items</h4>
                  <div className="overflow-x-auto">
                    <table className="table-sm table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th className="text-right">Price</th>
                          <th className="text-right">Qty</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderDetail.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.productName}</td>
                            <td className="text-right font-mono">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right font-mono">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Order Totals */}
                <div className="rounded-lg bg-base-200 p-4">
                  <div className="mb-2 flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono">
                      {formatCurrency(orderDetail.subtotal)}
                    </span>
                  </div>
                  <div className="mb-2 flex justify-between">
                    <span>Shipping</span>
                    <span className="font-mono">
                      {formatCurrency(orderDetail.shippingCost)}
                    </span>
                  </div>
                  <div className="mb-2 flex justify-between">
                    <span>Tax</span>
                    <span className="font-mono">
                      {formatCurrency(orderDetail.taxAmount)}
                    </span>
                  </div>
                  <div className="divider my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="font-mono">
                      {formatCurrency(orderDetail.totalPrice)}
                    </span>
                  </div>
                </div>

                {/* Payment Info */}
                {orderDetail.payment && (
                  <div>
                    <h4 className="mb-2 font-semibold">Payment</h4>
                    <div className="rounded-lg bg-base-200 p-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-base-content/60">Status:</span>{" "}
                          <span className="capitalize">
                            {orderDetail.payment.status}
                          </span>
                        </div>
                        <div>
                          <span className="text-base-content/60">
                            Provider:
                          </span>{" "}
                          {orderDetail.payment.provider}
                        </div>
                        {orderDetail.payment.paymentMethod && (
                          <div>
                            <span className="text-base-content/60">
                              Method:
                            </span>{" "}
                            {orderDetail.payment.paymentMethod}
                          </div>
                        )}
                        {orderDetail.payment.transactionId && (
                          <div className="col-span-2">
                            <span className="text-base-content/60">
                              Transaction:
                            </span>{" "}
                            <span className="font-mono text-xs">
                              {orderDetail.payment.transactionId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="modal-action">
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      const order = orders.find((o) => o.id === viewingOrderId);
                      if (order) handlePrintLabel(order);
                    }}
                  >
                    <Printer className="h-4 w-4" />
                    Print Label
                  </button>
                  {orderDetail.status !== "Delivered" &&
                    orderDetail.status !== "Cancelled" &&
                    orderDetail.status !== "Shipped" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          handleUpdateStatus(viewingOrderId, "Shipped");
                          handleCloseDetails();
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Mark as Shipped
                      </button>
                    )}
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={handleCloseDetails}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-base-content/60">
                Order not found
              </div>
            )}
          </div>
          <form method="dialog" className="modal-backdrop">
            <button type="button" onClick={handleCloseDetails}>
              close
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
