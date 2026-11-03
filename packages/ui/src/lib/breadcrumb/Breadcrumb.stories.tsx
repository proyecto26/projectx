import type { Meta, StoryObj } from "@storybook/react";
import { withRouterProvider } from "../providers/router";
import { Breadcrumb } from "./Breadcrumb";

const meta: Meta<typeof Breadcrumb> = {
  component: Breadcrumb,
  title: "Navigation/Breadcrumb",
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

const BreadcrumbWithProviders = withRouterProvider(Breadcrumb);

export const Default: Story = {
  render: (args) => <BreadcrumbWithProviders {...args} />,
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Products", href: "/products" },
      { label: "Running Shoes" },
    ],
  },
};

export const TwoItems: Story = {
  render: (args) => <BreadcrumbWithProviders {...args} />,
  args: {
    items: [{ label: "Home", href: "/" }, { label: "About" }],
  },
};

export const LongPath: Story = {
  render: (args) => <BreadcrumbWithProviders {...args} />,
  args: {
    items: [
      { label: "Home", href: "/" },
      { label: "Store", href: "/store" },
      { label: "Footwear", href: "/store/footwear" },
      { label: "Running", href: "/store/footwear/running" },
      { label: "Nike Air Max 2024" },
    ],
  },
};
