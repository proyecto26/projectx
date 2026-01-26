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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down";
  subtitle: string;
  urgent?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  change,
  trend,
  subtitle,
  urgent,
}: StatCardProps) {
  const isPositive = trend === "up";
  const showChange = change && trend;

  return (
    <div className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
      <div className="card-body p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div
                className={`rounded-lg p-2 ${urgent ? "bg-warning/10" : "bg-primary/10"}`}
              >
                {icon}
              </div>
              {urgent && (
                <div className="badge badge-warning badge-sm gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Urgent
                </div>
              )}
            </div>
            <h3 className="mt-3 font-medium text-base-content/60 text-xs uppercase tracking-wide">
              {label}
            </h3>
            <p className="mt-1 font-bold font-mono text-2xl text-base-content">
              {value}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-base-content/60 text-xs">{subtitle}</p>
            </div>
          </div>
          {showChange && (
            <div
              className={`flex items-center gap-1 ${isPositive ? "text-success" : "text-error"}`}
            >
              {isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-semibold text-sm">{change}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
}

function SectionHeader({ title, icon, description }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2">{icon}</div>
      <div>
        <h2 className="font-bold text-base-content text-lg">{title}</h2>
        {description && (
          <p className="text-base-content/60 text-xs">{description}</p>
        )}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  return (
    <div className="flex h-screen bg-base-300">
      {/* Sidebar */}
      <aside className="flex w-[280px] flex-col border-base-300 border-r bg-base-100">
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
              <div className="badge badge-primary badge-sm ml-auto">23</div>
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
              <div className="badge badge-error badge-sm ml-auto">5</div>
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
        <header className="border-base-300 border-b bg-base-100 px-8 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-bold font-mono text-2xl text-base-content">
                Dashboard Overview
              </h1>
              <p className="mt-1 text-base-content/60 text-sm">
                Real-time business performance metrics
              </p>
            </div>

            <div className="flex gap-2">
              {["Today", "7 Days", "30 Days", "Quarter"].map((period) => (
                <button
                  key={period}
                  type="button"
                  className={`btn btn-sm ${
                    period === "7 Days" ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 space-y-8 overflow-auto p-8">
          {/* Section 1: Sales & Revenue */}
          <section>
            <SectionHeader
              title="Sales & Revenue"
              icon={<DollarSign className="h-5 w-5 text-primary" />}
              description="Track your revenue performance and growth"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                label="Total Revenue"
                value={dashboardData.salesRevenue.totalRevenue.value}
                change={dashboardData.salesRevenue.totalRevenue.change}
                trend={dashboardData.salesRevenue.totalRevenue.trend}
                subtitle={dashboardData.salesRevenue.totalRevenue.subtitle}
              />
              <StatCard
                icon={<BarChart3 className="h-5 w-5 text-primary" />}
                label="GMV"
                value={dashboardData.salesRevenue.gmv.value}
                change={dashboardData.salesRevenue.gmv.change}
                trend={dashboardData.salesRevenue.gmv.trend}
                subtitle={dashboardData.salesRevenue.gmv.subtitle}
              />
              <StatCard
                icon={<ShoppingBag className="h-5 w-5 text-primary" />}
                label="Average Order Value"
                value={dashboardData.salesRevenue.aov.value}
                change={dashboardData.salesRevenue.aov.change}
                trend={dashboardData.salesRevenue.aov.trend}
                subtitle={dashboardData.salesRevenue.aov.subtitle}
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5 text-success" />}
                label="Revenue Growth"
                value={dashboardData.salesRevenue.revenueGrowth.value}
                change={dashboardData.salesRevenue.revenueGrowth.change}
                trend={dashboardData.salesRevenue.revenueGrowth.trend}
                subtitle={dashboardData.salesRevenue.revenueGrowth.subtitle}
              />
            </div>
          </section>

          {/* Section 2: Orders Snapshot */}
          <section>
            <SectionHeader
              title="Orders Snapshot"
              icon={<ShoppingCart className="h-5 w-5 text-primary" />}
              description="Monitor order volume and fulfillment"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard
                    icon={<ShoppingCart className="h-5 w-5 text-primary" />}
                    label="Orders Today"
                    value={dashboardData.ordersSnapshot.ordersToday.value}
                    change={dashboardData.ordersSnapshot.ordersToday.change}
                    trend={dashboardData.ordersSnapshot.ordersToday.trend}
                    subtitle={dashboardData.ordersSnapshot.ordersToday.subtitle}
                  />
                  <StatCard
                    icon={<Package className="h-5 w-5 text-primary" />}
                    label="Orders This Week"
                    value={dashboardData.ordersSnapshot.ordersThisWeek.value}
                    change={dashboardData.ordersSnapshot.ordersThisWeek.change}
                    trend={dashboardData.ordersSnapshot.ordersThisWeek.trend}
                    subtitle={
                      dashboardData.ordersSnapshot.ordersThisWeek.subtitle
                    }
                  />
                  <StatCard
                    icon={<AlertTriangle className="h-5 w-5 text-warning" />}
                    label="Pending Orders"
                    value={dashboardData.ordersSnapshot.pendingOrders.value}
                    subtitle={
                      dashboardData.ordersSnapshot.pendingOrders.subtitle
                    }
                    urgent={dashboardData.ordersSnapshot.pendingOrders.urgent}
                  />
                  <StatCard
                    icon={<Target className="h-5 w-5 text-success" />}
                    label="Fulfillment Rate"
                    value={dashboardData.ordersSnapshot.fulfillmentRate.value}
                    change={dashboardData.ordersSnapshot.fulfillmentRate.change}
                    trend={dashboardData.ordersSnapshot.fulfillmentRate.trend}
                    subtitle={
                      dashboardData.ordersSnapshot.fulfillmentRate.subtitle
                    }
                  />
                  <StatCard
                    icon={<Clock className="h-5 w-5 text-primary" />}
                    label="Avg Delivery Time"
                    value={dashboardData.ordersSnapshot.avgDeliveryTime.value}
                    change={dashboardData.ordersSnapshot.avgDeliveryTime.change}
                    trend={dashboardData.ordersSnapshot.avgDeliveryTime.trend}
                    subtitle={
                      dashboardData.ordersSnapshot.avgDeliveryTime.subtitle
                    }
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
                      <div key={item.status}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-base-content/70">
                            {item.status}
                          </span>
                          <span className="font-mono font-semibold">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-base-200">
                          <div
                            className={`h-2 rounded-full ${
                              item.status === "Completed"
                                ? "bg-success"
                                : item.status === "Processing"
                                  ? "bg-info"
                                  : item.status === "Pending"
                                    ? "bg-warning"
                                    : "bg-error"
                            }`}
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Customer Insights */}
          <section>
            <SectionHeader
              title="Customer Insights"
              icon={<Users className="h-5 w-5 text-primary" />}
              description="Understand your customer base and behavior"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={<Users className="h-5 w-5 text-primary" />}
                label="Total Customers"
                value={dashboardData.customerInsights.totalCustomers.value}
                change={dashboardData.customerInsights.totalCustomers.change}
                trend={dashboardData.customerInsights.totalCustomers.trend}
                subtitle={
                  dashboardData.customerInsights.totalCustomers.subtitle
                }
              />
              <StatCard
                icon={<UserCircle className="h-5 w-5 text-success" />}
                label="New Customers"
                value={dashboardData.customerInsights.newCustomers.value}
                subtitle={dashboardData.customerInsights.newCustomers.subtitle}
              />
              <StatCard
                icon={<Activity className="h-5 w-5 text-info" />}
                label="Returning Customers"
                value={dashboardData.customerInsights.returningCustomers.value}
                change={
                  dashboardData.customerInsights.returningCustomers.change
                }
                trend={dashboardData.customerInsights.returningCustomers.trend}
                subtitle={
                  dashboardData.customerInsights.returningCustomers.subtitle
                }
              />
              <StatCard
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                label="CAC"
                value={dashboardData.customerInsights.cac.value}
                change={dashboardData.customerInsights.cac.change}
                trend={dashboardData.customerInsights.cac.trend}
                subtitle={dashboardData.customerInsights.cac.subtitle}
              />
              <StatCard
                icon={<Award className="h-5 w-5 text-warning" />}
                label="CLV"
                value={dashboardData.customerInsights.clv.value}
                change={dashboardData.customerInsights.clv.change}
                trend={dashboardData.customerInsights.clv.trend}
                subtitle={dashboardData.customerInsights.clv.subtitle}
              />
              <StatCard
                icon={<Target className="h-5 w-5 text-success" />}
                label="Repeat Purchase Rate"
                value={dashboardData.customerInsights.repeatPurchaseRate.value}
                change={
                  dashboardData.customerInsights.repeatPurchaseRate.change
                }
                trend={dashboardData.customerInsights.repeatPurchaseRate.trend}
                subtitle={
                  dashboardData.customerInsights.repeatPurchaseRate.subtitle
                }
              />
            </div>
          </section>

          {/* Section 4: Product Performance */}
          <section>
            <SectionHeader
              title="Product Performance"
              icon={<Package className="h-5 w-5 text-primary" />}
              description="Track top sellers and inventory alerts"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Top Products Table */}
              <div className="card bg-base-100 shadow-sm lg:col-span-2">
                <div className="card-body p-5">
                  <h3 className="mb-4 font-semibold text-base-content text-sm">
                    Top 5 Selling Products
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="table-sm table">
                      <thead>
                        <tr className="border-base-300 border-b">
                          <th className="font-semibold text-xs uppercase">
                            Product
                          </th>
                          <th className="text-right font-semibold text-xs uppercase">
                            Units Sold
                          </th>
                          <th className="text-right font-semibold text-xs uppercase">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.productPerformance.topProducts.map(
                          (product, index) => (
                            <tr key={product.name} className="hover">
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="badge badge-sm badge-primary">
                                    {index + 1}
                                  </div>
                                  <span className="text-sm">
                                    {product.name}
                                  </span>
                                </div>
                              </td>
                              <td className="text-right font-mono">
                                {product.units}
                              </td>
                              <td className="text-right font-mono font-semibold">
                                {product.revenue}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Product Stats */}
              <div className="space-y-4">
                <StatCard
                  icon={<AlertTriangle className="h-5 w-5 text-warning" />}
                  label="Low Stock Alerts"
                  value={dashboardData.productPerformance.lowStockAlerts.value}
                  subtitle={
                    dashboardData.productPerformance.lowStockAlerts.subtitle
                  }
                  urgent={
                    dashboardData.productPerformance.lowStockAlerts.urgent
                  }
                />
                <StatCard
                  icon={<Eye className="h-5 w-5 text-primary" />}
                  label="Product Views"
                  value={dashboardData.productPerformance.productViews.value}
                  change={dashboardData.productPerformance.productViews.change}
                  trend={dashboardData.productPerformance.productViews.trend}
                  subtitle={
                    dashboardData.productPerformance.productViews.subtitle
                  }
                />
                <StatCard
                  icon={<MousePointer className="h-5 w-5 text-success" />}
                  label="Conversion Rate"
                  value={dashboardData.productPerformance.conversionRate.value}
                  change={
                    dashboardData.productPerformance.conversionRate.change
                  }
                  trend={dashboardData.productPerformance.conversionRate.trend}
                  subtitle={
                    dashboardData.productPerformance.conversionRate.subtitle
                  }
                />
              </div>
            </div>
          </section>

          {/* Section 5: Marketing & Traffic */}
          <section>
            <SectionHeader
              title="Marketing & Traffic"
              icon={<BarChart3 className="h-5 w-5 text-primary" />}
              description="Monitor visitor engagement and sources"
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <StatCard
                    icon={<Eye className="h-5 w-5 text-primary" />}
                    label="Total Visits"
                    value={dashboardData.marketingTraffic.totalVisits.value}
                    change={dashboardData.marketingTraffic.totalVisits.change}
                    trend={dashboardData.marketingTraffic.totalVisits.trend}
                    subtitle={
                      dashboardData.marketingTraffic.totalVisits.subtitle
                    }
                  />
                  <StatCard
                    icon={<Target className="h-5 w-5 text-success" />}
                    label="Store Conversion Rate"
                    value={
                      dashboardData.marketingTraffic.storeConversionRate.value
                    }
                    change={
                      dashboardData.marketingTraffic.storeConversionRate.change
                    }
                    trend={
                      dashboardData.marketingTraffic.storeConversionRate.trend
                    }
                    subtitle={
                      dashboardData.marketingTraffic.storeConversionRate
                        .subtitle
                    }
                  />
                </div>

                {/* Cart Abandonment */}
                <StatCard
                  icon={<ShoppingCart className="h-5 w-5 text-warning" />}
                  label="Cart Abandonment Rate"
                  value={
                    dashboardData.marketingTraffic.cartAbandonmentRate.value
                  }
                  change={
                    dashboardData.marketingTraffic.cartAbandonmentRate.change
                  }
                  trend={
                    dashboardData.marketingTraffic.cartAbandonmentRate.trend
                  }
                  subtitle={
                    dashboardData.marketingTraffic.cartAbandonmentRate.subtitle
                  }
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
                        <div key={source.source}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-base-content/70">
                              {source.source}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-base-content/60">
                                {source.visits}
                              </span>
                              <span className="font-mono font-semibold">
                                {source.percentage}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-base-200">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${source.percentage}%` }}
                            />
                          </div>
                        </div>
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
              title="Account Health"
              icon={<Activity className="h-5 w-5 text-primary" />}
              description="Monitor your seller performance metrics"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Seller Rating */}
              <div className="card bg-base-100 shadow-sm transition-shadow hover:shadow-md">
                <div className="card-body p-5">
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

              <StatCard
                icon={<Target className="h-5 w-5 text-success" />}
                label="Order Defect Rate"
                value={dashboardData.accountHealth.orderDefectRate.value}
                change={dashboardData.accountHealth.orderDefectRate.change}
                trend={dashboardData.accountHealth.orderDefectRate.trend}
                subtitle={dashboardData.accountHealth.orderDefectRate.subtitle}
              />
              <StatCard
                icon={<Clock className="h-5 w-5 text-info" />}
                label="Avg Response Time"
                value={dashboardData.accountHealth.avgResponseTime.value}
                change={dashboardData.accountHealth.avgResponseTime.change}
                trend={dashboardData.accountHealth.avgResponseTime.trend}
                subtitle={dashboardData.accountHealth.avgResponseTime.subtitle}
              />
              <StatCard
                icon={<Award className="h-5 w-5 text-success" />}
                label="Customer Satisfaction"
                value={dashboardData.accountHealth.customerSatisfaction.value}
                change={dashboardData.accountHealth.customerSatisfaction.change}
                trend={dashboardData.accountHealth.customerSatisfaction.trend}
                subtitle={
                  dashboardData.accountHealth.customerSatisfaction.subtitle
                }
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
