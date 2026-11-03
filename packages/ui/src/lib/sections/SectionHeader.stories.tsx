import type { Meta, StoryObj } from "@storybook/react";
import { BarChart2, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const meta: Meta<typeof SectionHeader> = {
  component: SectionHeader,
  title: "Data Display/SectionHeader",
};
export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  render: () => (
    <div className="w-96 bg-white p-4">
      <SectionHeader
        icon={BarChart2}
        title="Sales Overview"
        subtitle="Revenue and order trends"
      />
    </div>
  ),
};

export const WithDifferentIcons: Story = {
  render: () => (
    <div className="flex w-96 flex-col gap-6 bg-white p-4">
      <SectionHeader
        icon={ShoppingCart}
        title="Orders Snapshot"
        subtitle="Recent order activity"
      />
      <SectionHeader
        icon={Users}
        title="Customer Insights"
        subtitle="User acquisition and retention"
      />
      <SectionHeader
        icon={TrendingUp}
        title="Revenue Growth"
        subtitle="Monthly and yearly comparison"
      />
      <SectionHeader
        icon={BarChart2}
        title="Product Performance"
        subtitle="Top selling categories"
      />
    </div>
  ),
};
