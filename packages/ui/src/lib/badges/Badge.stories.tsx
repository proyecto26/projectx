import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./Badge";

const meta: Meta<typeof Badge> = {
  component: Badge,
  title: "Data Display/Badge",
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Success: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Success Badge</h2>
      <Badge variant="success" label="Completed" />
    </div>
  ),
};

export const Warning: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Warning Badge</h2>
      <Badge variant="warning" label="Pending" />
    </div>
  ),
};

export const ErrorBadge: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Error Badge</h2>
      <Badge variant="error" label="Failed" />
    </div>
  ),
};

export const Info: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Info Badge</h2>
      <Badge variant="info" label="In Review" />
    </div>
  ),
};

export const Urgent: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Urgent Badge</h2>
      <Badge variant="urgent" label="Urgent" />
    </div>
  ),
};

export const Count: Story = {
  render: () => (
    <div className="bg-white p-4">
      <h2 className="mb-4 font-bold text-xl">Count Badge</h2>
      <Badge variant="count" count={12} />
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="bg-white p-6">
      <h2 className="mb-6 font-bold text-xl">All Badge Variants</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="success" label="Completed" />
        <Badge variant="warning" label="Pending" />
        <Badge variant="error" label="Failed" />
        <Badge variant="info" label="In Review" />
        <Badge variant="urgent" label="Urgent" />
        <Badge variant="count" count={5} />
        <Badge variant="count" count={99} />
      </div>
    </div>
  ),
};
