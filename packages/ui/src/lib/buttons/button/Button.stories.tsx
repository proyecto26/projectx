import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta: Meta<typeof Button> = {
  component: Button,
  title: "Buttons/Button",
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Primary Button</h2>
      <Button variant="primary">Primary Button</Button>
    </div>
  ),
};

export const Secondary: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Secondary Button</h2>
      <Button variant="secondary">Secondary Button</Button>
    </div>
  ),
};

export const Accent: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Accent Button</h2>
      <Button variant="accent">Accent Button</Button>
    </div>
  ),
};

export const Ghost: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Ghost Button</h2>
      <Button variant="ghost">Ghost Button</Button>
    </div>
  ),
};
