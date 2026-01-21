import type { Meta, StoryObj } from "@storybook/react";
import { MicIcon } from "./Mic";

const meta: Meta<typeof MicIcon> = {
  component: MicIcon,
  title: "Icons/Mic",
  args: {
    className: "w-20 h-20 bg-blue-500",
    color: "white",
  },
};
export default meta;
type Story = StoryObj<typeof MicIcon>;

export const Primary: Story = {
  render: (args) => (
    <div className="flex h-40 min-h-screen w-full flex-col items-center justify-center gap-x-10 bg-medium">
      <MicIcon {...args} />
    </div>
  ),
};
