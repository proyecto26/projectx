import type { Meta, StoryObj } from "@storybook/react";
import { TableRow } from "./TableRow";

const meta: Meta<typeof TableRow> = {
  component: TableRow,
  title: "Table/TableRow",
  args: {
    rank: 1,
    name: "Wireless Headphones Pro",
    units: "1,240 units",
    revenue: "$48,200",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className="flex flex-col">
      <TableRow {...args} />
    </div>
  ),
};

export const TopThree: Story = {
  render: () => (
    <div className="flex flex-col">
      <TableRow
        rank={1}
        name="Wireless Headphones Pro"
        units="1,240 units"
        revenue="$48,200"
      />
      <TableRow
        rank={2}
        name="Smart Watch Series X"
        units="980 units"
        revenue="$39,500"
      />
      <TableRow
        rank={3}
        name="Noise Cancelling Earbuds"
        units="860 units"
        revenue="$27,800"
      />
    </div>
  ),
};

export const WithHighUnits: Story = {
  render: () => (
    <div className="flex flex-col">
      <TableRow
        rank={1}
        name="Premium Coffee Blend"
        units="12,450 units"
        revenue="$124,500"
      />
      <TableRow
        rank={2}
        name="Organic Green Tea"
        units="9,870 units"
        revenue="$98,700"
      />
      <TableRow
        rank={3}
        name="Herbal Infusion Pack"
        units="7,320 units"
        revenue="$73,200"
      />
    </div>
  ),
};
