import type { Meta, StoryObj } from "@storybook/react";
import {
  ArrowUpRight,
  DollarSign,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { Card } from "./Card";
import { MetricCard } from "./MetricCard";
import { MetricCardV2 } from "./MetricCardV2";
import { ProductCard } from "./ProductCard";

// ---------------------------------------------------------------------------
// Card (Base)
// ---------------------------------------------------------------------------

const cardMeta: Meta<typeof Card> = {
  component: Card,
  title: "Data Display/Card",
};
export default cardMeta;
type CardStory = StoryObj<typeof Card>;

export const Default: CardStory = {
  render: () => (
    <div className="bg-base-100 p-8">
      <Card
        title="Card Title"
        description="This is a description for the card component."
      >
        <p className="text-(--card-foreground) text-sm">
          Card content goes here. You can put any React children inside.
        </p>
      </Card>
    </div>
  ),
};

export const TitleOnly: CardStory = {
  render: () => (
    <div className="bg-base-100 p-8">
      <Card title="Title Only Card">
        <p className="text-(--muted-foreground) text-sm">
          Content without a description.
        </p>
      </Card>
    </div>
  ),
};

export const NoHeader: CardStory = {
  render: () => (
    <div className="bg-base-100 p-8">
      <Card>
        <p className="text-(--card-foreground) text-sm">
          A card with no title or description — just content.
        </p>
      </Card>
    </div>
  ),
};

export const CustomWidth: CardStory = {
  render: () => (
    <div className="bg-base-100 p-8">
      <Card
        title="Full Width Card"
        description="Override the default width using className."
        className="w-full max-w-xl"
      >
        <p className="text-(--muted-foreground) text-sm">
          This card overrides the default 320px width.
        </p>
      </Card>
    </div>
  ),
};

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

type MetricStory = StoryObj<typeof MetricCard>;

export const Metric: MetricStory = {
  render: () => (
    <div className="flex flex-wrap gap-4 bg-base-100 p-8">
      <MetricCard
        label="Total Revenue"
        value="$48,295"
        icon={DollarSign}
        trendLabel="+12.5% this month"
        trendIcon={TrendingUp}
      />
      <MetricCard
        label="Orders"
        value="1,204"
        icon={ShoppingBag}
        trendLabel="+8.1% this week"
      />
      <MetricCard label="Active Users" value="3,842" trendLabel="+3.2% today" />
    </div>
  ),
};

export const MetricNoTrend: MetricStory = {
  render: () => (
    <div className="bg-base-100 p-8">
      <MetricCard label="Pending Orders" value="47" icon={ShoppingBag} />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// MetricCardV2
// ---------------------------------------------------------------------------

type MetricV2Story = StoryObj<typeof MetricCardV2>;

const TrendBadge = () => (
  <span className="inline-flex items-center gap-0.5 rounded-full bg-success/15 px-2 py-0.5 font-medium text-[11px] text-success">
    <ArrowUpRight size={10} aria-hidden="true" />
    +5.2%
  </span>
);

export const MetricV2: MetricV2Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 bg-base-100 p-8">
      <MetricCardV2
        label="Revenue"
        value="$24.5K"
        subtext="vs last month"
        icon={DollarSign}
        badge={<TrendBadge />}
      />
      <MetricCardV2
        label="New Orders"
        value="312"
        subtext="this week"
        icon={ShoppingBag}
        badge={<TrendBadge />}
      />
      <MetricCardV2
        label="Conversions"
        value="6.4%"
        subtext="30-day average"
        icon={TrendingUp}
      />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// ProductCard
// ---------------------------------------------------------------------------

type ProductStory = StoryObj<typeof ProductCard>;

export const Product: ProductStory = {
  render: () => (
    <div className="flex flex-wrap gap-4 bg-base-100 p-8">
      <ProductCard
        productName="Wireless Noise-Cancelling Headphones"
        price={79.99}
        originalPrice={129.99}
        rating={4}
        reviewCount={238}
        freeShipping
      />
      <ProductCard
        productName="Mechanical Keyboard TKL"
        price={149.0}
        rating={5}
        reviewCount={91}
        freeShipping={false}
      />
      <ProductCard
        productName="USB-C Hub 7-in-1"
        price={34.95}
        originalPrice={49.95}
        rating={3}
        reviewCount={512}
        freeShipping
      />
    </div>
  ),
};

export const ProductWithImage: ProductStory = {
  render: () => (
    <div className="bg-base-100 p-8">
      <ProductCard
        productName="Premium Sneakers"
        price={89.99}
        originalPrice={119.99}
        rating={5}
        reviewCount={64}
        freeShipping
        imageSrc="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=640&q=80"
        imageAlt="Red and white Nike sneakers"
      />
    </div>
  ),
};
