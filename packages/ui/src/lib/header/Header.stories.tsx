import type { Meta, StoryObj } from "@storybook/react";

import { withRouterProvider } from "../providers/router";
import { Header } from "./Header";

const meta: Meta<typeof Header> = {
  component: Header,
  title: "Header",
  args: {
    title: "Home",
    sections: [
      {
        title: "Home",
        links: [
          {
            title: "Home",
            href: "/",
          },
        ],
      },
      {
        title: "About",
        links: [
          {
            title: "About",
            href: "/about",
          },
        ],
      },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof Header>;

const HeaderWithProviders = withRouterProvider(Header);

export const Primary: Story = {
  render: (args) => (
    <div className="flex h-40 min-h-screen w-full flex-col justify-start gap-x-10 bg-medium">
      <HeaderWithProviders {...args} className="h-20" />
    </div>
  ),
};
