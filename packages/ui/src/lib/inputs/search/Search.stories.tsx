import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { Search } from "./Search";

const meta: Meta<typeof Search> = {
  component: Search,
  title: "Search",
  args: {
    className: "",
    autoFocus: true,
    placeholder: "Search products, brands, etc",
    onBlur: fn(),
    onFocus: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof Search>;

export const Primary: Story = {
  render: (args) => (
    <div className="flex h-40 w-full flex-col items-center justify-center gap-x-10 bg-medium">
      <Search {...args} className="w-96" />
    </div>
  ),
};
