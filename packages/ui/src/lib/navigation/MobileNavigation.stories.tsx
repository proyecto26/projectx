import type { Meta, StoryObj } from "@storybook/react";
import { withRouterProvider } from "../providers/router";
import { MobileNavigation } from "./MobileNavigation";

const meta: Meta<typeof MobileNavigation> = {
  component: MobileNavigation,
  title: "Navigation/Mobile",
  args: {
    sections: [
      {
        title: "Home",
        links: [{ title: "Home", href: "/" }],
      },
      {
        title: "About",
        links: [{ title: "About", href: "/about" }],
      },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof MobileNavigation>;

const MobileNavigationWithProviders = withRouterProvider(MobileNavigation);

export const Primary: Story = {
  render: (args) => (
    <div className="flex h-40 min-h-screen w-full flex-col justify-start gap-x-10 bg-medium">
      <MobileNavigationWithProviders {...args} />
    </div>
  ),
};
