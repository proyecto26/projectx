import type { ProductDto } from "@projectx/models";
import { CategoryChip, ProductCard } from "@projectx/ui";
import { motion } from "framer-motion";
import {
  Baby,
  BookOpen,
  Camera,
  Car,
  Cpu,
  Dumbbell,
  Gamepad2,
  Headphones,
  Home,
  Shirt,
  Smartphone,
  Watch,
  Zap,
} from "lucide-react";
import type React from "react";
import { Link } from "react-router";

const CATEGORY_ICON_MAP: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  Electronics: Smartphone,
  Fashion: Shirt,
  "Home & Garden": Home,
  Sports: Dumbbell,
  Books: BookOpen,
  Automotive: Car,
  Baby: Baby,
  Gaming: Gamepad2,
  Audio: Headphones,
  Wearables: Watch,
  "Home Automation": Home,
  Photography: Camera,
  Technology: Cpu,
};

type HomepageProductCardProps = {
  product: ProductDto;
  onAddToCart: (product: ProductDto) => void;
  index: number;
  discountBadge?: boolean;
};

function HomepageProductCard({
  product,
  onAddToCart,
  index,
  discountBadge = false,
}: HomepageProductCardProps) {
  const rating = 3.5 + (product.id % 3) * 0.5;
  const reviewCount = 100 + ((product.id * 137) % 2000);
  const hasDiscount = discountBadge || product.id % 3 === 0;
  const discountPct = 10 + (product.id % 5) * 10;
  const originalPrice = hasDiscount ? product.estimatedPrice * 1.25 : undefined;
  const hasFreeShipping = product.id % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: index * 0.05 }}
      className="relative h-full transition-shadow hover:shadow-md"
    >
      <Link to={`/product/${product.id}`} className="block h-full no-underline">
        {hasDiscount && (
          <div className="absolute top-2 left-2 z-10 rounded-full bg-[var(--error,oklch(0.58_0.22_27))] px-2 py-0.5 font-bold text-[11px] text-white">
            -{discountPct}%
          </div>
        )}
        <ProductCard
          productName={product.name}
          price={product.estimatedPrice}
          originalPrice={originalPrice}
          rating={rating}
          reviewCount={reviewCount}
          imageSrc={product.imageUrl ?? undefined}
          imageAlt={product.name}
          freeShipping={hasFreeShipping}
          onQuickAdd={() => onAddToCart(product)}
          className="h-full"
        />
      </Link>
    </motion.div>
  );
}

export type MarketplaceHomepageProps = {
  products: ProductDto[];
  categories: string[];
  onCategorySelect: (cat: string | undefined) => void;
  selectedCategory?: string;
  onAddToCart: (product: ProductDto) => void;
};

export const MarketplaceHomepage: React.FC<MarketplaceHomepageProps> = ({
  products,
  categories,
  onCategorySelect,
  selectedCategory,
  onAddToCart,
}) => {
  const featuredProducts = products.slice(0, 4);
  const dealsProducts = products.slice(4, 8);

  return (
    <div className="w-full">
      {/* Hero Banner */}
      <section
        className="w-full"
        style={{
          background:
            "linear-gradient(135deg, #6366F1 0%, #818CF8 55%, #A5B4FC 100%)",
          minHeight: "360px",
          padding: "80px 64px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div className="flex max-w-[600px] flex-col gap-6">
          {/* Flash Sale tag */}
          <div
            className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 font-medium text-sm text-white"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <Zap size={15} className="text-white" />
            Flash Sale — Up to 60% Off
          </div>

          {/* Title */}
          <h1
            className="font-bold text-white"
            style={{
              fontSize: "40px",
              letterSpacing: "-1px",
              lineHeight: "1.15",
              maxWidth: "600px",
            }}
          >
            Discover Amazing Deals on ProjectX
          </h1>

          {/* Subtitle */}
          <p
            className="text-white/80"
            style={{ fontSize: "16px", maxWidth: "500px" }}
          >
            Shop millions of products with free shipping and secure checkout.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-lg bg-white px-6 py-3 font-semibold text-[#6366F1] text-sm transition-opacity hover:opacity-90"
              onClick={() => onCategorySelect(undefined)}
            >
              Shop Now
            </button>
            <button
              type="button"
              className="rounded-lg border border-white px-6 py-3 font-semibold text-sm text-white transition-colors hover:bg-white/10"
              onClick={() => onCategorySelect(undefined)}
            >
              View Deals
            </button>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="px-6 py-8">
          <div className="mb-5 flex items-center justify-between">
            <h2
              className="font-semibold text-[var(--foreground)]"
              style={{ fontSize: "22px" }}
            >
              Shop by Category
            </h2>
            <button
              type="button"
              onClick={() => onCategorySelect(undefined)}
              className="font-medium text-[var(--primary)] text-sm hover:underline"
              style={{ fontSize: "14px" }}
            >
              See all
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat];
              return (
                <CategoryChip
                  key={cat}
                  label={cat}
                  icon={Icon}
                  selected={selectedCategory === cat}
                  onClick={() =>
                    onCategorySelect(selectedCategory === cat ? undefined : cat)
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="px-6 pb-8">
          <div className="mb-5 flex items-center justify-between">
            <h2
              className="font-semibold text-[var(--foreground)]"
              style={{ fontSize: "22px" }}
            >
              Featured Products
            </h2>
            <button
              type="button"
              onClick={() => onCategorySelect(undefined)}
              className="font-medium text-[var(--primary)] text-sm hover:underline"
              style={{ fontSize: "14px" }}
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {featuredProducts.map((product, index) => (
              <HomepageProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {/* Today's Deals */}
      {dealsProducts.length > 0 && (
        <section className="px-6 pb-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2
                className="font-semibold text-[var(--foreground)]"
                style={{ fontSize: "22px" }}
              >
                Today's Deals
              </h2>
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--error,oklch(0.58_0.22_27))]" />
            </div>
            <button
              type="button"
              onClick={() => onCategorySelect(undefined)}
              className="font-medium text-[var(--primary)] text-sm hover:underline"
              style={{ fontSize: "14px" }}
            >
              View all deals
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {dealsProducts.map((product, index) => (
              <HomepageProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                index={index}
                discountBadge
              />
            ))}
          </div>
        </section>
      )}

      {/* Promo Banner */}
      <section
        className="flex items-center justify-between rounded-xl"
        style={{
          background: "linear-gradient(90deg, #6366F1 0%, #4F46E5 100%)",
          minHeight: "120px",
          padding: "0 48px",
        }}
      >
        <div>
          <p className="font-bold text-white" style={{ fontSize: "20px" }}>
            Become a Seller on ProjectX
          </p>
          <p className="mt-1 text-sm text-white/75">
            Reach millions of customers and grow your business with us.
          </p>
        </div>
        <button
          type="button"
          className="ml-6 shrink-0 rounded-lg bg-white px-6 py-2.5 font-semibold text-[#4F46E5] text-sm transition-opacity hover:opacity-90"
        >
          Start Selling
        </button>
      </section>

      {/* Footer is provided by the root Layout component */}
    </div>
  );
};

export default MarketplaceHomepage;
