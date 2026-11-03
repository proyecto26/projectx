import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { SearchBar } from "./SearchBar";

const meta: Meta<typeof SearchBar> = {
  component: SearchBar,
  title: "Inputs/SearchBar",
  args: {
    placeholder: "Search...",
    onChange: fn(),
    onSubmit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {
  render: (args) => (
    <div className="flex items-center justify-center p-8">
      <SearchBar {...args} />
    </div>
  ),
};

export const WithPlaceholder: Story = {
  render: (args) => (
    <div className="flex items-center justify-center p-8">
      <SearchBar {...args} placeholder="Search products, brands, etc..." />
    </div>
  ),
};

export const WithValue: Story = {
  render: (args) => (
    <div className="flex items-center justify-center p-8">
      <SearchBar {...args} value="Wireless headphones" />
    </div>
  ),
};

export const FullWidth: Story = {
  render: (args) => (
    <div className="flex w-full items-center justify-center p-8">
      <SearchBar
        {...args}
        placeholder="Search anything..."
        className="w-full"
      />
    </div>
  ),
};
