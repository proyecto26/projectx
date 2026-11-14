import type { Meta, StoryObj } from "@storybook/react";
import { withRouterProvider } from "../providers/router";
import { Navigation } from "./Navigation";

const meta: Meta<typeof Navigation> = {
  component: Navigation,
  title: "Navigation/Desktop",
  args: {
    sections: [
      {
        title: "Home",
        links: [{ title: "Home", href: "/" }],
      },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof Navigation>;

const NavigationWithProviders = withRouterProvider(Navigation);

export const Primary: Story = {
  render: (args) => (
    <div className="flex h-40 min-h-screen w-full flex-col justify-start gap-x-10 bg-medium">
      <NavigationWithProviders {...args} />
    </div>
  ),
};
