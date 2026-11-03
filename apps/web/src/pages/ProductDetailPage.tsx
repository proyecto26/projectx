import type { ProductDto } from "@projectx/models";
import { Badge, Breadcrumb, ProductCard } from "@projectx/ui";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Minus,
  Pencil,
  Plus,
  ShoppingCart,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useCart } from "react-use-cart";

// ---------------------------------------------------------------------------
// Mock data for reviews, colors, and storage options
// ---------------------------------------------------------------------------

const MOCK_REVIEWS = [
  {
    id: 1,
    author: "Alex M.",
    initials: "AM",
    date: "Jan 15, 2025",
    rating: 5,
    text: "Absolutely incredible quality. Exceeded my expectations in every way. Would definitely recommend to anyone looking for a premium product.",
  },
  {
    id: 2,
    author: "Sarah K.",
    initials: "SK",
    date: "Jan 10, 2025",
    rating: 4,
    text: "Great product overall. Very comfortable and well-built. Had a minor issue initially but it resolved quickly. Solid value for the price.",
  },
  {
    id: 3,
    author: "James R.",
    initials: "JR",
    date: "Dec 28, 2024",
    rating: 4,
    text: "Excellent value for money. The build quality feels premium and everything works exactly as described. Very happy with this purchase.",
  },
];

const COLOR_OPTIONS = [
  { id: "natural-titanium", label: "Natural Titanium", hex: "#b0a99a" },
  { id: "black-titanium", label: "Black Titanium", hex: "#3a3a3a" },
  { id: "white-titanium", label: "White Titanium", hex: "#e8e4df" },
  { id: "desert-titanium", label: "Desert Titanium", hex: "#c9a882" },
];

const STORAGE_OPTIONS = ["256 GB", "512 GB", "1 TB"];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StarRating({
  rating,
  max = 5,
  size = 14,
}: {
  rating: number;
  max?: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.round(rating);
        return (
          <Star
            key={`star-${filled ? "filled" : "empty"}-${i + 1}`}
            size={size}
            className={
              filled
                ? "fill-[var(--rating,oklch(0.78_0.17_75))] text-[var(--rating,oklch(0.78_0.17_75))]"
                : "fill-[var(--border)] text-[var(--border)]"
            }
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export type ProductDetailPageProps = {
  product: ProductDto;
  relatedProducts: ProductDto[];
};

export function ProductDetailPage({
  product,
  relatedProducts,
}: ProductDetailPageProps) {
  const { addItem } = useCart();
  const [selectedColor, setSelectedColor] = useState(
    COLOR_OPTIONS[0]?.id ?? "natural-titanium",
  );
  const [selectedStorage, setSelectedStorage] = useState(
    STORAGE_OPTIONS[0] ?? "256 GB",
  );
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  // Derived display values
  const rating = 4.7;
  const reviewCount = 4521;
  const hasDiscount = product.id % 3 === 0;
  const originalPrice = hasDiscount ? product.estimatedPrice * 1.25 : undefined;
  const discountPct = originalPrice
    ? Math.round(
        ((originalPrice - product.estimatedPrice) / originalPrice) * 100,
      )
    : null;

  const selectedColorLabel =
    COLOR_OPTIONS.find((c) => c.id === selectedColor)?.label ?? "";

  function handleAddToCart() {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.estimatedPrice,
      currency: "USD",
      image: product.imageUrl,
      quantity,
    });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb
        className="mb-6"
        items={[
          { label: "Home", href: "/" },
          ...(product.category
            ? [
                {
                  label: product.category,
                  href: `/marketplace?category=${encodeURIComponent(product.category)}`,
                },
              ]
            : [{ label: "Products", href: "/marketplace" }]),
          { label: product.name },
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      {/* Top section: Gallery + Product Info                              */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image Gallery */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Main image */}
          <div
            className="flex w-full items-center justify-center overflow-hidden rounded-lg"
            style={{
              height: "420px",
              background: "var(--muted,oklch(0.97_0_0))",
            }}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-[var(--muted-foreground)]">
                <ShoppingCart size={56} aria-hidden="true" />
                <span className="text-sm">No image available</span>
              </div>
            )}
          </div>

          {/* Thumbnail row */}
          <div className="mt-2 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                type="button"
                aria-label={`View image ${i + 1}`}
                className="flex items-center justify-center overflow-hidden rounded-md transition-colors focus:outline-none"
                style={{
                  width: 80,
                  height: 80,
                  border:
                    i === 0
                      ? "2px solid var(--primary)"
                      : "2px solid var(--border)",
                  background: "var(--muted,oklch(0.97_0_0))",
                  flexShrink: 0,
                }}
              >
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={`Thumbnail ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ShoppingCart
                    size={20}
                    className="text-[var(--muted-foreground)]"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="flex flex-col gap-5"
        >
          {/* Title */}
          <h1
            className="font-bold text-[var(--foreground)]"
            style={{
              fontSize: "26px",
              letterSpacing: "-0.5px",
              lineHeight: "1.25",
            }}
          >
            {product.name}
          </h1>

          {/* Rating row */}
          <div className="flex items-center gap-2">
            <StarRating rating={rating} />
            <span
              className="text-[var(--muted-foreground)] text-sm"
              style={{ fontSize: "14px" }}
            >
              {rating} ({reviewCount.toLocaleString()} reviews)
            </span>
          </div>

          {/* Badge row */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" label="In Stock" />
            <Badge variant="info" label="Free Shipping" />
          </div>

          {/* Price row */}
          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className="font-bold text-[var(--foreground)]"
              style={{
                fontSize: "32px",
                letterSpacing: "-1px",
              }}
            >
              ${product.estimatedPrice.toFixed(2)}
            </span>
            {originalPrice && (
              <span
                className="text-[var(--muted-foreground)] line-through"
                style={{ fontSize: "16px" }}
              >
                ${originalPrice.toFixed(2)}
              </span>
            )}
            {discountPct && (
              <span
                className="rounded-full px-2.5 py-1 font-bold text-white text-xs"
                style={{ background: "var(--destructive,oklch(0.58_0.22_27))" }}
              >
                -{discountPct}%
              </span>
            )}
          </div>

          {/* Divider */}
          <hr style={{ borderColor: "var(--border)" }} />

          {/* Color section */}
          <div>
            <p
              className="mb-2 font-medium text-[var(--foreground)] text-sm"
              style={{ fontSize: "14px" }}
            >
              Color:{" "}
              <span className="font-normal text-[var(--muted-foreground)]">
                {selectedColorLabel}
              </span>
            </p>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  aria-label={color.label}
                  onClick={() => setSelectedColor(color.id)}
                  className="h-7 w-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    background: color.hex,
                    border:
                      selectedColor === color.id
                        ? "2.5px solid var(--primary)"
                        : "2px solid var(--border)",
                    boxShadow:
                      selectedColor === color.id
                        ? "0 0 0 2px var(--background), 0 0 0 4px var(--primary)"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Storage section */}
          <div>
            <p
              className="mb-2 font-medium text-[var(--foreground)] text-sm"
              style={{ fontSize: "14px" }}
            >
              Storage
            </p>
            <div className="flex flex-wrap gap-2">
              {STORAGE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelectedStorage(opt)}
                  className="rounded-full px-4 py-1.5 font-medium text-sm transition-colors focus:outline-none"
                  style={
                    selectedStorage === opt
                      ? {
                          background: "var(--primary)",
                          color: "var(--primary-foreground,#fff)",
                          border: "none",
                        }
                      : {
                          background: "transparent",
                          color: "var(--foreground)",
                          border: "1.5px solid var(--border)",
                        }
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity row */}
          <div className="flex items-center gap-3">
            <span
              className="font-medium text-[var(--foreground)] text-sm"
              style={{ fontSize: "14px" }}
            >
              Quantity:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
                className="flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                style={{ width: 32, height: 32 }}
              >
                <Minus size={14} />
              </button>
              <span
                className="min-w-[28px] text-center font-semibold text-[var(--foreground)]"
                style={{ fontSize: "14px" }}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus:outline-none"
                style={{ width: 32, height: 32 }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Button row */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none"
              style={{
                background: "var(--primary)",
                color: "var(--primary-foreground,#fff)",
                padding: "11px 16px",
                fontSize: "14px",
              }}
            >
              <ShoppingCart size={16} aria-hidden="true" />
              Add to Cart
            </button>
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg font-semibold transition-colors hover:bg-[var(--surface)] focus:outline-none"
              style={{
                border: "1.5px solid var(--primary)",
                color: "var(--primary)",
                padding: "10px 16px",
                fontSize: "14px",
              }}
            >
              <Zap size={16} aria-hidden="true" />
              Buy Now
            </button>
            <button
              type="button"
              aria-label={
                wishlisted ? "Remove from wishlist" : "Add to wishlist"
              }
              onClick={() => setWishlisted((v) => !v)}
              className="flex items-center justify-center rounded-md border border-[var(--border)] transition-colors hover:bg-[var(--surface)] focus:outline-none"
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                color: wishlisted
                  ? "var(--destructive,oklch(0.58_0.22_27))"
                  : "var(--muted-foreground)",
              }}
            >
              <Heart size={18} fill={wishlisted ? "currentColor" : "none"} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Customer Reviews Section                                         */}
      {/* ---------------------------------------------------------------- */}
      <motion.section
        className="mt-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* Section header */}
        <div className="flex items-center justify-between">
          <h2
            className="font-semibold text-[var(--foreground)]"
            style={{ fontSize: "22px" }}
          >
            Customer Reviews
          </h2>
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 font-medium text-[var(--foreground)] text-sm transition-colors hover:bg-[var(--surface)] focus:outline-none"
          >
            <Pencil size={14} />
            Write a Review
          </button>
        </div>

        {/* Review cards */}
        <div className="flex flex-col gap-4">
          {MOCK_REVIEWS.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-5"
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {/* Top row: avatar + name + date */}
              <div className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold text-[var(--primary-foreground,#fff)] text-xs"
                  style={{ background: "var(--primary)", fontSize: "11px" }}
                >
                  {review.initials}
                </div>
                <span
                  className="flex-1 font-semibold text-[var(--foreground)]"
                  style={{ fontSize: "14px" }}
                >
                  {review.author}
                </span>
                <span
                  className="text-[var(--muted-foreground)]"
                  style={{ fontSize: "12px" }}
                >
                  {review.date}
                </span>
              </div>

              {/* Star row */}
              <StarRating rating={review.rating} />

              {/* Review text */}
              <p
                className="text-[var(--muted-foreground)]"
                style={{ fontSize: "14px", lineHeight: "1.5" }}
              >
                {review.text}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ---------------------------------------------------------------- */}
      {/* Related Products Section                                         */}
      {/* ---------------------------------------------------------------- */}
      {relatedProducts.length > 0 && (
        <motion.section
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          style={{ display: "flex", flexDirection: "column", gap: "20px" }}
        >
          <h2
            className="font-semibold text-[var(--foreground)]"
            style={{ fontSize: "22px" }}
          >
            Related Products
          </h2>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence>
              {relatedProducts.slice(0, 4).map((related, index) => {
                const relatedRating = 3.5 + (related.id % 3) * 0.5;
                const relatedReviewCount = 100 + ((related.id * 137) % 2000);
                const relatedHasDiscount = related.id % 3 === 0;
                const relatedOriginalPrice = relatedHasDiscount
                  ? related.estimatedPrice * 1.2
                  : undefined;

                return (
                  <motion.div
                    key={related.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: index * 0.06 }}
                  >
                    <Link
                      to={`/product/${related.id}`}
                      className="block transition-shadow hover:shadow-md"
                      style={{ textDecoration: "none" }}
                    >
                      <ProductCard
                        productName={related.name}
                        price={related.estimatedPrice}
                        originalPrice={relatedOriginalPrice}
                        rating={relatedRating}
                        reviewCount={relatedReviewCount}
                        imageSrc={related.imageUrl ?? undefined}
                        imageAlt={related.name}
                        freeShipping={related.id % 2 === 0}
                        className="h-full"
                      />
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.section>
      )}

      {/* Bottom spacing */}
      <div className="h-12" aria-hidden="true" />
    </div>
  );
}

export default ProductDetailPage;
