import type { Meta, StoryObj } from "@storybook/react";
import { ThemeButton } from "./ThemeButton";

const meta: Meta<typeof ThemeButton> = {
  component: ThemeButton,
  title: "Buttons/ThemeButton",
};
export default meta;
type Story = StoryObj<typeof ThemeButton>;

export const Primary: Story = {
  render: () => (
    <div className="flex h-40 w-full flex-row items-center justify-center gap-x-10 bg-base-100 dark:bg-base-200">
      <ThemeButton theme="light" />
    </div>
  ),
};
