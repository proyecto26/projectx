import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar } from "./ProgressBar";

const meta: Meta<typeof ProgressBar> = {
  component: ProgressBar,
  title: "Data Display/ProgressBar",
};
export default meta;
type Story = StoryObj<typeof ProgressBar>;

export const Default: Story = {
  render: () => (
    <div className="w-80 bg-white p-4">
      <ProgressBar label="Revenue" value={72} />
    </div>
  ),
};

export const HalfFull: Story = {
  render: () => (
    <div className="w-80 bg-white p-4">
      <ProgressBar label="Orders Processed" value={50} />
    </div>
  ),
};

export const Complete: Story = {
  render: () => (
    <div className="w-80 bg-white p-4">
      <ProgressBar label="Goal Reached" value={100} />
    </div>
  ),
};

export const WithCustomColor: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4 bg-white p-4">
      <ProgressBar label="Primary" value={65} color="primary" />
      <ProgressBar label="Warning" value={40} color="warning" />
      <ProgressBar label="Error" value={20} color="error" />
    </div>
  ),
};

export const Multiple: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-4 bg-white p-4">
      <ProgressBar label="Electronics" value={85} color="success" />
      <ProgressBar label="Clothing" value={62} color="primary" />
      <ProgressBar label="Books" value={48} color="warning" />
      <ProgressBar label="Furniture" value={30} color="error" />
    </div>
  ),
};
