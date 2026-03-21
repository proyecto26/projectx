import type { Meta, StoryObj } from "@storybook/react";
import { Shirt, Smartphone, Tag, Zap } from "lucide-react";
import { BrowserRouter } from "react-router-dom";
import { CategoryChip } from "./CategoryChip";

const meta: Meta<typeof CategoryChip> = {
  component: CategoryChip,
  title: "Components/CategoryChip",
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CategoryChip>;

export const Default: Story = {
  args: {
    label: "Electronics",
  },
};

export const Selected: Story = {
  args: {
    label: "Electronics",
    selected: true,
  },
};

export const WithIcon: Story = {
  args: {
    label: "Electronics",
    icon: Smartphone,
  },
};

export const WithIconSelected: Story = {
  args: {
    label: "Electronics",
    icon: Smartphone,
    selected: true,
  },
};

export const WithHref: Story = {
  args: {
    label: "Shop Now",
    icon: Tag,
    href: "/products",
  },
};

export const Multiple: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <CategoryChip label="All" selected />
      <CategoryChip label="Electronics" icon={Smartphone} />
      <CategoryChip label="Clothing" icon={Shirt} />
      <CategoryChip label="Flash Deals" icon={Zap} selected />
      <CategoryChip label="New Arrivals" />
    </div>
  ),
};
