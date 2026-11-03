import type { Meta, StoryObj } from "@storybook/react";
import {
  BarChart2,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import { withRouterProvider } from "../providers/router";
import { NavItem } from "./NavItem";
import { NavSection } from "./NavSection";

// ---------------------------------------------------------------------------
// NavItem meta
// ---------------------------------------------------------------------------

const meta: Meta<typeof NavItem> = {
  component: NavItem,
  title: "Sidebar/NavItem",
  decorators: [
    (Story) => {
      const Wrapped = withRouterProvider(() => <Story />);
      return <Wrapped />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof NavItem>;

// ---------------------------------------------------------------------------
// NavItem stories
// ---------------------------------------------------------------------------

export const NavItemActive: Story = {
  render: () => (
    <div className="w-56 bg-white p-2 dark:bg-slate-900">
      <NavItem icon={LayoutDashboard} label="Dashboard" href="/" active />
    </div>
  ),
};

export const NavItemDefault: Story = {
  render: () => (
    <div className="w-56 bg-white p-2 dark:bg-slate-900">
      <NavItem icon={ShoppingCart} label="Orders" href="/orders" />
    </div>
  ),
};

export const NavItemWithBadge: Story = {
  render: () => (
    <div className="w-56 bg-white p-2 dark:bg-slate-900">
      <NavItem icon={ShoppingCart} label="Orders" href="/orders" badge={12} />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// NavSection story (uses its own meta inline via render)
// ---------------------------------------------------------------------------

export const NavSectionExample: Story = {
  render: () => (
    <div className="w-56 bg-white p-2 dark:bg-slate-900">
      <NavSection title="Main">
        <NavItem icon={LayoutDashboard} label="Dashboard" href="/" active />
        <NavItem icon={ShoppingCart} label="Orders" href="/orders" badge={5} />
        <NavItem icon={Package} label="Products" href="/products" />
        <NavItem icon={Users} label="Customers" href="/customers" />
      </NavSection>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Full sidebar composition
// ---------------------------------------------------------------------------

export const FullSidebar: Story = {
  render: () => (
    <div className="flex h-screen w-56 flex-col gap-6 bg-white p-3 shadow-sm dark:bg-slate-900">
      {/* Brand / logo placeholder */}
      <div className="px-3.5 py-2">
        <span className="font-semibold text-base text-indigo-600 dark:text-indigo-400">
          ProjectX
        </span>
      </div>

      {/* Main section */}
      <NavSection title="Main">
        <NavItem icon={LayoutDashboard} label="Dashboard" href="/" active />
        <NavItem icon={ShoppingCart} label="Orders" href="/orders" badge={8} />
        <NavItem icon={Package} label="Products" href="/products" />
        <NavItem icon={Users} label="Customers" href="/customers" />
      </NavSection>

      {/* Settings section */}
      <NavSection title="Settings">
        <NavItem icon={BarChart2} label="Analytics" href="/analytics" />
        <NavItem icon={Settings} label="Settings" href="/settings" />
      </NavSection>
    </div>
  ),
};
