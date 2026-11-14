import { Badge, Breadcrumb } from "@projectx/ui";
import { motion } from "framer-motion";
import { Minus, Package, Plus, ShoppingCart, Star, Truck } from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Mock data (will be replaced by loader data once backend wires up)
// ---------------------------------------------------------------------------

const product = {
  id: 1,
  name: "Wireless Noise-Cancelling Headphones Pro",
  brand: "SoundMax",
  price: 79.99,
  originalPrice: 129.99,
  rating: 4,
  reviews: 2341,
  inStock: true,
  freeShipping: true,
  description:
    "Experience premium audio quality with our flagship wireless headphones. Featuring active noise cancellation technology, 30-hour battery life, and ultra-comfortable memory foam ear cushions. Perfect for travel, work, and everyday listening.",
  features: [
    "Active Noise Cancellation (ANC)",
    "30-hour battery life",
    "Bluetooth 5.0 connectivity",
    "Memory foam ear cushions",
    "Built-in microphone for calls",
    "Foldable design for easy storage",
    "USB-C fast charging (15 min = 3 hrs playback)",
  ],
  shippingInfo:
    "Free standard shipping on orders over $35. Estimated delivery 3-5 business days. Express shipping available at checkout.",
  reviewList: [
    {
      id: 1,
      author: "Alex M.",
      rating: 5,
      date: "Jan 15, 2025",
      comment:
        "Absolutely incredible sound quality. The noise cancellation is top-notch and the battery lasts all day.",
    },
    {
      id: 2,
      author: "Sarah K.",
      rating: 4,
      date: "Jan 10, 2025",
      comment:
        "Great headphones! Very comfortable for long sessions. Slight connectivity issues initially but resolved after firmware update.",
    },
    {
      id: 3,
      author: "James R.",
      rating: 4,
      date: "Dec 28, 2024",
      comment:
        "Excellent value for money. The build quality feels premium and the sound is crisp and clear.",
    },
  ],
};

const discountPercent = Math.round(
  ((product.originalPrice - product.price) / product.originalPrice) * 100,
);

// ---------------------------------------------------------------------------
// Star rating component
// ---------------------------------------------------------------------------

function StarRating({
  rating,
  max = 5,
  size = 16,
}: {
  rating: number;
  max?: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < rating;
        return (
          <Star
            key={`star-${filled ? "filled" : "empty"}-${i + 1}`}
            size={size}
            className={
              filled
                ? "fill-[var(--rating)] text-[var(--rating)]"
                : "fill-[var(--border)] text-[var(--border)]"
            }
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content components
// ---------------------------------------------------------------------------

function DescriptionTab() {
  return (
    <div className="space-y-4">
      <p className="text-[var(--muted-foreground)] leading-relaxed">
        {product.description}
      </p>
      <div>
        <h3 className="mb-3 font-semibold text-[var(--foreground)]">
          Key Features
        </h3>
        <ul className="space-y-2">
          {product.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-[var(--muted-foreground)] text-sm"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReviewsTab() {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="text-center">
          <p className="font-bold text-4xl text-[var(--foreground)]">
            {product.rating}.0
          </p>
          <StarRating rating={product.rating} size={14} />
          <p className="mt-1 text-[var(--muted-foreground)] text-xs">
            {product.reviews.toLocaleString()} reviews
          </p>
        </div>
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct =
              star === 5
                ? 60
                : star === 4
                  ? 25
                  : star === 3
                    ? 10
                    : star === 2
                      ? 3
                      : 2;
            return (
              <div key={star} className="mb-1 flex items-center gap-2 text-xs">
                <span className="w-3 text-right text-[var(--muted-foreground)]">
                  {star}
                </span>
                <Star
                  size={11}
                  className="fill-[var(--rating)] text-[var(--rating)]"
                />
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--rating)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-[var(--muted-foreground)]">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review list */}
      {product.reviewList.map((review) => (
        <div
          key={review.id}
          className="border-[var(--border)] border-b pb-4 last:border-0"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-[var(--foreground)] text-sm">
              {review.author}
            </span>
            <span className="text-[var(--muted-foreground)] text-xs">
              {review.date}
            </span>
          </div>
          <StarRating rating={review.rating} size={12} />
          <p className="mt-2 text-[var(--muted-foreground)] text-sm">
            {review.comment}
          </p>
        </div>
      ))}
    </div>
  );
}

function ShippingTab() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <Truck
          size={20}
          className="mt-0.5 shrink-0 text-[var(--primary)]"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-[var(--foreground)] text-sm">
            Free Standard Shipping
          </p>
          <p className="mt-1 text-[var(--muted-foreground)] text-sm">
            {product.shippingInfo}
          </p>
        </div>
      </div>
      <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <Package
          size={20}
          className="mt-0.5 shrink-0 text-[var(--primary)]"
          aria-hidden="true"
        />
        <div>
          <p className="font-medium text-[var(--foreground)] text-sm">
            Easy Returns
          </p>
          <p className="mt-1 text-[var(--muted-foreground)] text-sm">
            30-day hassle-free return policy. Return or exchange your product
            within 30 days of delivery for any reason.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const TABS = ["Description", "Reviews", "Shipping"] as const;
type TabName = (typeof TABS)[number];

export function ProductDetail() {
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<TabName>("Description");

  function increment() {
    setQuantity((q) => q + 1);
  }

  function decrement() {
    setQuantity((q) => Math.max(1, q - 1));
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Breadcrumb */}
        <Breadcrumb
          className="mb-6"
          items={[
            { label: "Home", href: "/" },
            { label: "Electronics", href: "/marketplace?category=Electronics" },
            { label: product.name },
          ]}
        />

        {/* Product layout */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* ---------------------------------------------------------------- */}
          {/* Image area                                                        */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Main image placeholder */}
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
              <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
                <div
                  className="flex h-28 w-28 items-center justify-center rounded-full"
                  style={{ background: "var(--accent)" }}
                >
                  <ShoppingCart
                    size={56}
                    className="text-[var(--primary)]"
                    aria-hidden="true"
                  />
                </div>
                <span className="text-sm">Product image</span>
              </div>
            </div>

            {/* Thumbnail row */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((thumb) => (
                <button
                  key={thumb}
                  type="button"
                  className="flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--primary)] focus:outline-none"
                  aria-label={`View image ${thumb}`}
                >
                  <ShoppingCart
                    size={20}
                    className="text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </motion.div>

          {/* ---------------------------------------------------------------- */}
          {/* Product info                                                      */}
          {/* ---------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col gap-4"
          >
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {product.inStock && <Badge variant="success" label="In Stock" />}
              <Badge variant="info" label="Best Seller" />
            </div>

            {/* Product name */}
            <div>
              <p className="mb-1 text-[var(--muted-foreground)] text-sm">
                {product.brand}
              </p>
              <h1 className="font-bold text-2xl text-[var(--foreground)] leading-snug sm:text-3xl">
                {product.name}
              </h1>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <StarRating rating={product.rating} size={16} />
              <span className="font-medium text-[var(--primary)] text-sm">
                {product.rating}.0
              </span>
              <span className="text-[var(--muted-foreground)] text-sm">
                ({product.reviews.toLocaleString()} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-bold text-3xl text-[var(--foreground)]">
                ${product.price.toFixed(2)}
              </span>
              <span className="text-[var(--muted-foreground)] text-lg line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
              <span className="rounded-full bg-[var(--success-muted)] px-2.5 py-1 font-semibold text-[var(--success)] text-sm">
                {discountPercent}% OFF
              </span>
            </div>

            {/* Free shipping indicator */}
            {product.freeShipping && (
              <div className="flex items-center gap-2 text-[var(--success)] text-sm">
                <Truck size={16} aria-hidden="true" />
                <span className="font-medium">Free Shipping</span>
              </div>
            )}

            {/* Description excerpt */}
            <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
              {product.description.slice(0, 140)}…
            </p>

            {/* Divider */}
            <hr className="border-[var(--border)]" />

            {/* Quantity selector */}
            <div className="flex items-center gap-4">
              <span className="font-medium text-[var(--foreground)] text-sm">
                Quantity
              </span>
              <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <button
                  type="button"
                  onClick={decrement}
                  disabled={quantity <= 1}
                  className="flex h-10 w-10 items-center justify-center rounded-l-xl text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center font-semibold text-[var(--foreground)]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={increment}
                  className="flex h-10 w-10 items-center justify-center rounded-r-xl text-[var(--foreground)] transition-colors hover:bg-[var(--surface)]"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Add to cart — desktop */}
            <div className="hidden sm:flex sm:gap-3">
              <button
                type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 font-semibold text-white shadow transition-transform hover:scale-[1.02] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              >
                <ShoppingCart size={18} aria-hidden="true" />
                Add to Cart
              </button>
              <button
                type="button"
                className="flex items-center justify-center rounded-xl border-2 border-[var(--primary)] px-6 py-3 font-semibold text-[var(--primary)] transition-transform hover:scale-[1.02] hover:bg-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              >
                Buy Now
              </button>
            </div>
          </motion.div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Tabs section                                                        */}
        {/* ------------------------------------------------------------------ */}
        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Tab list */}
          <div className="flex border-[var(--border)] border-b">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative px-5 py-3 font-medium text-sm transition-colors focus:outline-none ${
                  activeTab === tab
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-[var(--primary)]"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="py-6">
            {activeTab === "Description" && <DescriptionTab />}
            {activeTab === "Reviews" && <ReviewsTab />}
            {activeTab === "Shipping" && <ShippingTab />}
          </div>
        </motion.div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Sticky bottom bar — mobile only                                       */}
      {/* -------------------------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-[var(--border)] border-t bg-[var(--card)] px-4 py-3 shadow-lg sm:hidden">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-bold text-[var(--foreground)] text-lg">
              ${product.price.toFixed(2)}
            </span>
            {product.freeShipping && (
              <span className="text-[var(--success)] text-xs">
                Free Shipping
              </span>
            )}
          </div>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-3 font-semibold text-sm text-white shadow transition-opacity hover:opacity-90 active:scale-95"
          >
            <ShoppingCart size={16} aria-hidden="true" />
            Add to Cart
          </button>
        </div>
      </div>

      {/* Bottom padding so content doesn't hide behind sticky bar on mobile */}
      <div className="h-20 sm:hidden" aria-hidden="true" />
    </div>
  );
}

export default ProductDetail;
