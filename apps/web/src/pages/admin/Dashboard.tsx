import {
  Badge,
  MetricCard,
  MetricCardV2,
  ProgressBar,
  SectionHeader,
  TableRow,
} from "@projectx/ui";
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Bell,
  Clock,
  DollarSign,
  Eye,
  LayoutDashboard,
  LogOut,
  MousePointer,
  Package,
  PieChart,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserCircle,
  Users,
} from "lucide-react";
import { Link } from "react-router";

// Mock data for the dashboard
const dashboardData = {
  // Section 1: Sales & Revenue
  salesRevenue: {
    totalRevenue: {
      value: "$2.2M",
      change: "+12.3%",
      trend: "up" as const,
      subtitle: "vs last month",
    },
    gmv: {
      value: "$2.8M",
      change: "+15.7%",
      trend: "up" as const,
      subtitle: "Gross Merchandise Volume",
    },
    aov: {
      value: "$246.75",
      change: "+8.2%",
      trend: "up" as const,
      subtitle: "Average Order Value",
    },
    revenueGrowth: {
      value: "18.5%",
      change: "+3.2%",
      trend: "up" as const,
      subtitle: "YoY Growth",
    },
  },

  // Section 2: Orders Snapshot
  ordersSnapshot: {
    ordersToday: {
      value: "142",
      change: "+23.5%",
      trend: "up" as const,
      subtitle: "vs yesterday",
    },
    ordersThisWeek: {
      value: "847",
      change: "+12.1%",
      trend: "up" as const,
      subtitle: "vs last week",
    },
    pendingOrders: {
      value: "23",
      urgent: true,
      subtitle: "Needs attention",
    },
    fulfillmentRate: {
      value: "96.3%",
      change: "+1.2%",
      trend: "up" as const,
      subtitle: "Last 30 days",
    },
    avgDeliveryTime: {
      value: "2.4 days",
      change: "-0.3 days",
      trend: "up" as const,
      subtitle: "Improvement",
    },
  },

  // Section 3: Customer Insights
  customerInsights: {
    totalCustomers: {
      value: "12,847",
      change: "+8.4%",
      trend: "up" as const,
      subtitle: "Total active",
    },
    newCustomers: {
      value: "523",
      subtitle: "This month",
    },
    returningCustomers: {
      value: "1,234",
      change: "+15.2%",
      trend: "up" as const,
      subtitle: "Returning buyers",
    },
    cac: {
      value: "$34.50",
      change: "-5.2%",
      trend: "up" as const,
      subtitle: "Customer Acquisition Cost",
    },
    clv: {
      value: "$892.40",
      change: "+12.8%",
      trend: "up" as const,
      subtitle: "Customer Lifetime Value",
    },
    repeatPurchaseRate: {
      value: "42.3%",
      change: "+3.1%",
      trend: "up" as const,
      subtitle: "Repeat purchases",
    },
  },

  // Section 4: Product Performance
  productPerformance: {
    topProducts: [
      { name: "Premium T-Shirt", units: 1247, revenue: "$24,940" },
      { name: "Classic Hoodie", units: 892, revenue: "$44,600" },
      { name: "Denim Jacket", units: 623, revenue: "$49,840" },
      { name: "Canvas Sneakers", units: 534, revenue: "$32,040" },
      { name: "Leather Wallet", units: 421, revenue: "$16,840" },
    ],
    lowStockAlerts: {
      value: "12",
      urgent: true,
      subtitle: "Products below threshold",
    },
    productViews: {
      value: "24,567",
      change: "+18.3%",
      trend: "up" as const,
      subtitle: "This week",
    },
    conversionRate: {
      value: "3.2%",
      change: "+0.8%",
      trend: "up" as const,
      subtitle: "View to purchase",
    },
    productsNeedingAttention: {
      value: "8",
      subtitle: "Low ratings or returns",
    },
  },

  // Section 5: Marketing & Traffic
  marketingTraffic: {
    totalVisits: {
      value: "142,567",
      change: "+22.4%",
      trend: "up" as const,
      subtitle: "This month",
    },
    storeConversionRate: {
      value: "2.8%",
      change: "+0.5%",
      trend: "up" as const,
      subtitle: "Visits to purchases",
    },
    trafficSources: [
      { source: "Direct", percentage: 35, visits: "49,898" },
      { source: "Search", percentage: 28, visits: "39,918" },
      { source: "Social", percentage: 22, visits: "31,364" },
      { source: "Referral", percentage: 15, visits: "21,385" },
    ],
    cartAbandonmentRate: {
      value: "68.4%",
      change: "-3.2%",
      trend: "up" as const,
      subtitle: "Improvement from last month",
    },
  },

  // Section 6: Account Health
  accountHealth: {
    sellerRating: {
      value: "4.8",
      maxValue: "5.0",
      reviews: "1,234",
      stars: 4.8,
    },
    orderDefectRate: {
      value: "0.3%",
      change: "-0.1%",
      trend: "up" as const,
      subtitle: "Target: < 1%",
      status: "excellent" as const,
    },
    avgResponseTime: {
      value: "2.3 hrs",
      change: "-0.5 hrs",
      trend: "up" as const,
      subtitle: "Customer support",
    },
    customerSatisfaction: {
      value: "92%",
      change: "+4.2%",
      trend: "up" as const,
      subtitle: "NPS Score",
    },
  },

  // Order status distribution
  orderStatusDistribution: [
    { status: "Completed", count: 234, percentage: 65 },
    { status: "Processing", count: 89, percentage: 25 },
    { status: "Pending", count: 23, percentage: 6 },
    { status: "Cancelled", count: 14, percentage: 4 },
  ],
};

type OrderStatus = "Completed" | "Processing" | "Pending" | "Cancelled";

function getOrderStatusColor(
  status: string,
): "success" | "info" | "warning" | "error" {
  const map: Record<OrderStatus, "success" | "info" | "warning" | "error"> = {
    Completed: "success",
    Processing: "info",
    Pending: "warning",
    Cancelled: "error",
  };
  return map[status as OrderStatus] ?? "primary";
}

export function AdminDashboardPage() {
  return (
    <div className="flex h-screen bg-base-300">
      {/* Sidebar - hidden on mobile, visible on lg+ */}
      <aside className="hidden border-base-300 border-r bg-base-100 lg:flex lg:w-[260px] lg:flex-col">
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
              className="flex w-full items-center gap-3 border-primary border-r-2 bg-primary/10 px-6 py-3 text-primary"
            >
              <LayoutDashboard className="h-5 w-5" />
              <span className="font-medium text-sm">Dashboard</span>
            </Link>
            <Link
              to="/admin/orders"
              className="flex w-full items-center gap-3 px-6 py-3 text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="font-medium text-sm">Orders</span>
              <Badge variant="count" count={23} className="ml-auto" />
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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-base-300 border-b bg-base-100 px-4 py-4 lg:px-8 lg:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {/* Page title: always visible on mobile, also on desktop */}
              <h1 className="font-bold font-mono text-[22px] text-base-content lg:text-2xl">
                Dashboard
              </h1>
              <p className="mt-1 text-[13px] text-base-content/60 lg:text-sm">
                Real-time metrics
              </p>
            </div>

            {/* Period filter buttons - scrollable on mobile */}
            <div className="overflow-x-auto">
              <div className="flex flex-nowrap gap-2">
                {["Today", "7 Days", "30 Days", "Quarter"].map((period) => (
                  <button
                    key={period}
                    type="button"
                    className={`btn btn-sm shrink-0 ${
                      period === "7 Days" ? "btn-primary" : "btn-ghost"
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 space-y-5 overflow-auto p-4 lg:space-y-8 lg:p-8">
          {/* Section 1: Sales & Revenue */}
          <section>
            <SectionHeader
              icon={DollarSign}
              title="Sales & Revenue"
              subtitle="Track your revenue performance and growth"
              className="mb-3 lg:mb-4"
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <MetricCard
                label="Total Revenue"
                value={dashboardData.salesRevenue.totalRevenue.value}
                icon={DollarSign}
                trendLabel={`${dashboardData.salesRevenue.totalRevenue.change} ${dashboardData.salesRevenue.totalRevenue.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
              <MetricCard
                label="GMV"
                value={dashboardData.salesRevenue.gmv.value}
                icon={BarChart3}
                trendLabel={`${dashboardData.salesRevenue.gmv.change} ${dashboardData.salesRevenue.gmv.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
              <MetricCard
                label="Average Order Value"
                value={dashboardData.salesRevenue.aov.value}
                icon={ShoppingBag}
                trendLabel={`${dashboardData.salesRevenue.aov.change} ${dashboardData.salesRevenue.aov.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
              <MetricCard
                label="Revenue Growth"
                value={dashboardData.salesRevenue.revenueGrowth.value}
                icon={TrendingUp}
                trendLabel={`${dashboardData.salesRevenue.revenueGrowth.change} ${dashboardData.salesRevenue.revenueGrowth.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
            </div>
          </section>

          {/* Section 2: Orders Snapshot */}
          <section>
            <SectionHeader
              icon={ShoppingCart}
              title="Orders Snapshot"
              subtitle="Monitor order volume and fulfillment"
              className="mb-3 lg:mb-4"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
                  <MetricCard
                    label="Orders Today"
                    value={dashboardData.ordersSnapshot.ordersToday.value}
                    icon={ShoppingCart}
                    trendLabel={`${dashboardData.ordersSnapshot.ordersToday.change} ${dashboardData.ordersSnapshot.ordersToday.subtitle}`}
                    trendIcon={TrendingUp}
                    className="w-full"
                  />
                  <MetricCard
                    label="Orders This Week"
                    value={dashboardData.ordersSnapshot.ordersThisWeek.value}
                    icon={Package}
                    trendLabel={`${dashboardData.ordersSnapshot.ordersThisWeek.change} ${dashboardData.ordersSnapshot.ordersThisWeek.subtitle}`}
                    trendIcon={TrendingUp}
                    className="w-full"
                  />
                  <MetricCardV2
                    label="Pending Orders"
                    value={dashboardData.ordersSnapshot.pendingOrders.value}
                    icon={AlertTriangle}
                    subtext={
                      dashboardData.ordersSnapshot.pendingOrders.subtitle
                    }
                    badge={<Badge variant="urgent" label="Urgent" />}
                    className="w-full"
                  />
                  <MetricCard
                    label="Fulfillment Rate"
                    value={dashboardData.ordersSnapshot.fulfillmentRate.value}
                    icon={Target}
                    trendLabel={`${dashboardData.ordersSnapshot.fulfillmentRate.change} ${dashboardData.ordersSnapshot.fulfillmentRate.subtitle}`}
                    trendIcon={TrendingUp}
                    className="w-full"
                  />
                  <MetricCard
                    label="Avg Delivery Time"
                    value={dashboardData.ordersSnapshot.avgDeliveryTime.value}
                    icon={Clock}
                    trendLabel={`${dashboardData.ordersSnapshot.avgDeliveryTime.change} ${dashboardData.ordersSnapshot.avgDeliveryTime.subtitle}`}
                    trendIcon={TrendingDown}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Order Status Distribution */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-5">
                  <h3 className="mb-4 font-semibold text-base-content text-sm">
                    Order Status Distribution
                  </h3>
                  <div className="space-y-3">
                    {dashboardData.orderStatusDistribution.map((item) => (
                      <ProgressBar
                        key={item.status}
                        label={item.status}
                        value={item.count}
                        max={360}
                        color={getOrderStatusColor(item.status)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Customer Insights */}
          <section>
            <SectionHeader
              icon={Users}
              title="Customer Insights"
              subtitle="Understand your customer base and behavior"
              className="mb-3 lg:mb-4"
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
              <MetricCard
                label="Total Customers"
                value={dashboardData.customerInsights.totalCustomers.value}
                icon={Users}
                trendLabel={`${dashboardData.customerInsights.totalCustomers.change} ${dashboardData.customerInsights.totalCustomers.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
              <MetricCardV2
                label="New Customers"
                value={dashboardData.customerInsights.newCustomers.value}
                icon={UserCircle}
                subtext={dashboardData.customerInsights.newCustomers.subtitle}
                className="w-full"
              />
              <MetricCard
                label="Returning Customers"
                value={dashboardData.customerInsights.returningCustomers.value}
                icon={Activity}
                trendLabel={`${dashboardData.customerInsights.returningCustomers.change} ${dashboardData.customerInsights.returningCustomers.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
              <MetricCard
                label="CAC"
                value={dashboardData.customerInsights.cac.value}
                icon={DollarSign}
                trendLabel={`${dashboardData.customerInsights.cac.change} ${dashboardData.customerInsights.cac.subtitle}`}
                trendIcon={TrendingDown}
                className="w-full"
              />
              <MetricCard
                label="CLV"
                value={dashboardData.customerInsights.clv.value}
                icon={Award}
                trendLabel={`${dashboardData.customerInsights.clv.change} ${dashboardData.customerInsights.clv.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
              <MetricCard
                label="Repeat Purchase Rate"
                value={dashboardData.customerInsights.repeatPurchaseRate.value}
                icon={Target}
                trendLabel={`${dashboardData.customerInsights.repeatPurchaseRate.change} ${dashboardData.customerInsights.repeatPurchaseRate.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
            </div>
          </section>

          {/* Section 4: Product Performance */}
          <section>
            <SectionHeader
              icon={Package}
              title="Product Performance"
              subtitle="Track top sellers and inventory alerts"
              className="mb-3 lg:mb-4"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Top Products - table on desktop, card list on mobile */}
              <div className="card bg-base-100 shadow-sm lg:col-span-2">
                <div className="card-body p-4 lg:p-5">
                  <h3 className="mb-4 font-semibold text-base-content text-sm">
                    Top 5 Selling Products
                  </h3>

                  {/* Desktop table header */}
                  <div className="hidden items-center gap-3 border-base-300 border-b px-4 py-2 lg:flex">
                    <div className="h-7 w-7 shrink-0" />
                    <span className="flex-1 font-semibold text-base-content/60 text-xs uppercase">
                      Product
                    </span>
                    <span className="w-[100px] shrink-0 text-right font-semibold text-base-content/60 text-xs uppercase">
                      Units Sold
                    </span>
                    <span className="w-[100px] shrink-0 text-right font-semibold text-base-content/60 text-xs uppercase">
                      Revenue
                    </span>
                  </div>

                  {/* Desktop table rows */}
                  <div className="hidden overflow-x-auto lg:block">
                    {dashboardData.productPerformance.topProducts.map(
                      (product, index) => (
                        <TableRow
                          key={product.name}
                          rank={index + 1}
                          name={product.name}
                          units={product.units}
                          revenue={product.revenue}
                          className="w-full"
                        />
                      ),
                    )}
                  </div>

                  {/* Mobile card list */}
                  <div className="space-y-2 lg:hidden">
                    {dashboardData.productPerformance.topProducts.map(
                      (product, index) => (
                        <div
                          key={product.name}
                          className="flex items-center gap-3 rounded-lg bg-base-200/50 px-3 py-2.5"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-base-300 font-bold font-mono text-base-content/60 text-xs">
                            {index + 1}
                          </span>
                          <span className="flex-1 truncate font-medium text-base-content text-sm">
                            {product.name}
                          </span>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className="font-semibold text-base-content text-xs">
                              {product.revenue}
                            </span>
                            <span className="text-base-content/50 text-xs">
                              {product.units} units
                            </span>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>

              {/* Product Stats */}
              <div className="space-y-3 lg:space-y-4">
                <MetricCardV2
                  label="Low Stock Alerts"
                  value={dashboardData.productPerformance.lowStockAlerts.value}
                  icon={AlertTriangle}
                  subtext={
                    dashboardData.productPerformance.lowStockAlerts.subtitle
                  }
                  badge={<Badge variant="urgent" label="Urgent" />}
                  className="w-full"
                />
                <MetricCard
                  label="Product Views"
                  value={dashboardData.productPerformance.productViews.value}
                  icon={Eye}
                  trendLabel={`${dashboardData.productPerformance.productViews.change} ${dashboardData.productPerformance.productViews.subtitle}`}
                  trendIcon={TrendingUp}
                  className="w-full"
                />
                <MetricCard
                  label="Conversion Rate"
                  value={dashboardData.productPerformance.conversionRate.value}
                  icon={MousePointer}
                  trendLabel={`${dashboardData.productPerformance.conversionRate.change} ${dashboardData.productPerformance.conversionRate.subtitle}`}
                  trendIcon={TrendingUp}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* Section 5: Marketing & Traffic */}
          <section>
            <SectionHeader
              icon={BarChart3}
              title="Marketing & Traffic"
              subtitle="Monitor visitor engagement and sources"
              className="mb-3 lg:mb-4"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-3 grid grid-cols-2 gap-3 lg:mb-4 lg:gap-4">
                  <MetricCard
                    label="Total Visits"
                    value={dashboardData.marketingTraffic.totalVisits.value}
                    icon={Eye}
                    trendLabel={`${dashboardData.marketingTraffic.totalVisits.change} ${dashboardData.marketingTraffic.totalVisits.subtitle}`}
                    trendIcon={TrendingUp}
                    className="w-full"
                  />
                  <MetricCard
                    label="Store Conversion Rate"
                    value={
                      dashboardData.marketingTraffic.storeConversionRate.value
                    }
                    icon={Target}
                    trendLabel={`${dashboardData.marketingTraffic.storeConversionRate.change} ${dashboardData.marketingTraffic.storeConversionRate.subtitle}`}
                    trendIcon={TrendingUp}
                    className="w-full"
                  />
                </div>

                {/* Cart Abandonment */}
                <MetricCard
                  label="Cart Abandonment Rate"
                  value={
                    dashboardData.marketingTraffic.cartAbandonmentRate.value
                  }
                  icon={ShoppingCart}
                  trendLabel={`${dashboardData.marketingTraffic.cartAbandonmentRate.change} ${dashboardData.marketingTraffic.cartAbandonmentRate.subtitle}`}
                  trendIcon={TrendingDown}
                  className="w-full"
                />
              </div>

              {/* Traffic Sources */}
              <div className="card bg-base-100 shadow-sm">
                <div className="card-body p-5">
                  <h3 className="mb-4 font-semibold text-base-content text-sm">
                    Traffic Sources
                  </h3>
                  <div className="space-y-4">
                    {dashboardData.marketingTraffic.trafficSources.map(
                      (source) => (
                        <ProgressBar
                          key={source.source}
                          label={source.source}
                          value={source.percentage}
                          max={100}
                          color="primary"
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Account Health */}
          <section>
            <SectionHeader
              icon={Activity}
              title="Account Health"
              subtitle="Monitor your seller performance metrics"
              className="mb-3 lg:mb-4"
            />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              {/* Seller Rating - kept inline as unique star-rating display */}
              <div className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
                <div className="card-body p-4 lg:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="inline-block rounded-lg bg-warning/10 p-2">
                        <Star className="h-5 w-5 text-warning" />
                      </div>
                      <h3 className="mt-3 font-medium text-base-content/60 text-xs uppercase tracking-wide">
                        Seller Rating
                      </h3>
                      <div className="mt-1 flex items-baseline gap-1">
                        <p className="font-bold font-mono text-2xl text-base-content">
                          {dashboardData.accountHealth.sellerRating.value}
                        </p>
                        <span className="text-base-content/60 text-sm">
                          / {dashboardData.accountHealth.sellerRating.maxValue}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3 w-3 ${
                              star <=
                              Math.floor(
                                dashboardData.accountHealth.sellerRating.stars,
                              )
                                ? "fill-warning text-warning"
                                : "text-base-content/20"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-base-content/60 text-xs">
                          ({dashboardData.accountHealth.sellerRating.reviews}{" "}
                          reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <MetricCard
                label="Order Defect Rate"
                value={dashboardData.accountHealth.orderDefectRate.value}
                icon={Target}
                trendLabel={`${dashboardData.accountHealth.orderDefectRate.change} ${dashboardData.accountHealth.orderDefectRate.subtitle}`}
                trendIcon={TrendingDown}
                className="w-full"
              />
              <MetricCard
                label="Avg Response Time"
                value={dashboardData.accountHealth.avgResponseTime.value}
                icon={Clock}
                trendLabel={`${dashboardData.accountHealth.avgResponseTime.change} ${dashboardData.accountHealth.avgResponseTime.subtitle}`}
                trendIcon={TrendingDown}
                className="w-full"
              />
              <MetricCard
                label="Customer Satisfaction"
                value={dashboardData.accountHealth.customerSatisfaction.value}
                icon={Award}
                trendLabel={`${dashboardData.accountHealth.customerSatisfaction.change} ${dashboardData.accountHealth.customerSatisfaction.subtitle}`}
                trendIcon={TrendingUp}
                className="w-full"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
