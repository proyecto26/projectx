import type { Meta, StoryObj } from "@storybook/react";
import { BrowserRouter } from "react-router-dom";
import { Footer } from "./Footer";

const meta: Meta<typeof Footer> = {
  component: Footer,
  title: "Footer",
  decorators: [
    (Story) => (
      <BrowserRouter>
        <Story />
      </BrowserRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Primary: Story = {
  args: {
    socialLinks: [
      {
        title: "GitHub",
        href: "https://github.com/proyecto26",
      },
      {
        title: "Twitter",
        href: "https://twitter.com/jdnichollsc",
      },
    ],
  },
};

export const WithCustomTitle: Story = {
  args: {
    ...Primary.args,
    title: "Custom Project",
  },
};
