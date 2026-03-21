import { CategoryChip, ProductCard } from "@projectx/ui";
import { motion } from "framer-motion";
import {
  Car,
  Dumbbell,
  Gamepad2,
  Shirt,
  Smartphone,
  Sparkles,
  Tent,
  Utensils,
} from "lucide-react";
import type React from "react";
import { Link } from "react-router";

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const categories = [
  { label: "Electronics", icon: Smartphone },
  { label: "Apparel", icon: Shirt },
  { label: "Toys & Games", icon: Gamepad2 },
  { label: "Sports", icon: Dumbbell },
  { label: "Beauty", icon: Sparkles },
  { label: "Auto/Office", icon: Car },
  { label: "Food", icon: Utensils },
  { label: "Camping", icon: Tent },
];

interface Product {
  id: number;
  name: string;
  rating: number;
  reviews: number;
  price: number;
  originalPrice?: number;
  badge?: string;
  salePercent?: number;
  freeShipping: boolean;
  bgColor: string;
}

const featuredProducts: Product[] = [
  {
    id: 1,
    name: "Wireless Noise-Cancelling Headphones",
    rating: 4,
    reviews: 2341,
    price: 79.99,
    originalPrice: 129.99,
    freeShipping: true,
    bgColor: "bg-slate-200 dark:bg-slate-600",
  },
  {
    id: 2,
    name: "Smart Fitness Tracker Band",
    rating: 5,
    reviews: 876,
    price: 49.99,
    freeShipping: true,
    bgColor: "bg-indigo-100 dark:bg-indigo-900",
  },
  {
    id: 3,
    name: "Portable Bluetooth Speaker",
    rating: 4,
    reviews: 1102,
    price: 34.99,
    originalPrice: 59.99,
    freeShipping: true,
    bgColor: "bg-purple-100 dark:bg-purple-900",
  },
  {
    id: 4,
    name: "Ergonomic Laptop Stand",
    rating: 5,
    reviews: 543,
    price: 29.99,
    freeShipping: false,
    bgColor: "bg-green-100 dark:bg-green-900",
  },
];

const todayDeals: Product[] = [
  {
    id: 5,
    name: '4K Ultra HD Smart TV 55"',
    rating: 4,
    reviews: 3892,
    price: 399.99,
    originalPrice: 699.99,
    badge: "DEAL",
    salePercent: 43,
    freeShipping: true,
    bgColor: "bg-red-100 dark:bg-red-900",
  },
  {
    id: 6,
    name: "Air Fryer 6-Quart",
    rating: 5,
    reviews: 5120,
    price: 59.99,
    originalPrice: 99.99,
    badge: "DEAL",
    salePercent: 40,
    freeShipping: true,
    bgColor: "bg-orange-100 dark:bg-orange-900",
  },
  {
    id: 7,
    name: "Robot Vacuum Cleaner",
    rating: 4,
    reviews: 2244,
    price: 179.99,
    originalPrice: 349.99,
    badge: "DEAL",
    salePercent: 49,
    freeShipping: true,
    bgColor: "bg-blue-100 dark:bg-blue-900",
  },
  {
    id: 8,
    name: "Standing Desk Converter",
    rating: 4,
    reviews: 891,
    price: 89.99,
    originalPrice: 149.99,
    badge: "DEAL",
    salePercent: 40,
    freeShipping: false,
    bgColor: "bg-teal-100 dark:bg-teal-900",
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.35 },
  }),
};

function AnimatedProductCard({
  product,
  index,
}: {
  product: Product;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      <ProductCard
        productName={product.name}
        price={product.price}
        originalPrice={product.originalPrice}
        rating={product.rating}
        reviewCount={product.reviews}
        freeShipping={product.freeShipping}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const HomePage: React.FC = () => {
  return (
    // Break out of the Layout's container mx-auto px-4 py-8 wrapper
    <div className="-mx-4 -mt-8">
      {/* ------------------------------------------------------------------ */}
      {/* Hero Banner                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A5B4FC 100%)",
        }}
        className="px-4 py-10 md:px-16 md:py-20"
      >
        <motion.div
          className="mx-auto max-w-3xl text-center text-white"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <span className="mb-6 inline-block rounded-full bg-white/20 px-4 py-1.5 font-medium text-sm backdrop-blur-sm">
            New arrivals are here!
          </span>

          <h1 className="mb-4 font-extrabold text-4xl leading-tight sm:text-5xl lg:text-6xl">
            Discover Amazing Deals on ProjectX
          </h1>

          <p className="mb-8 text-indigo-100 text-lg sm:text-xl">
            Shop millions of products with free shipping and reliable delivery
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/marketplace"
              className="rounded-lg bg-white px-8 py-3 font-semibold text-indigo-700 shadow transition-transform hover:scale-105 hover:shadow-lg"
            >
              Shop Now
            </Link>
            <Link
              to="/marketplace"
              className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-transform hover:scale-105 hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Shop by Category                                                     */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[var(--foreground)] text-xl sm:text-2xl">
              Shop by Category
            </h2>
            <Link
              to="/marketplace"
              className="font-medium text-[var(--primary)] text-sm hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="flex flex-nowrap gap-3 overflow-x-auto pb-2">
            {categories.map(({ label, icon: Icon }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
              >
                <CategoryChip
                  label={label}
                  icon={Icon}
                  href={`/marketplace?category=${encodeURIComponent(label)}`}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Featured Products                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-[var(--surface)] px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-bold text-[var(--foreground)] text-xl sm:text-2xl">
              Featured Products
            </h2>
            <Link
              to="/marketplace"
              className="font-medium text-[var(--primary)] text-sm hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featuredProducts.map((product, i) => (
              <AnimatedProductCard
                key={product.id}
                product={product}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Today's Deals                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section className="px-4 py-10 md:px-8 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--destructive)]" />
              <h2 className="font-bold text-[var(--foreground)] text-xl sm:text-2xl">
                Today's Deals
              </h2>
            </div>
            <Link
              to="/marketplace?tab=deals"
              className="font-medium text-[var(--primary)] text-sm hover:underline"
            >
              View all deals
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {todayDeals.map((product, i) => (
              <AnimatedProductCard
                key={product.id}
                product={product}
                index={i}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Promo Banner                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section
        style={{
          background:
            "linear-gradient(135deg, #6366F1 0%, #818CF8 50%, #A5B4FC 100%)",
        }}
        className="px-4 py-16 md:px-16"
      >
        <motion.div
          className="mx-auto max-w-3xl text-center text-white"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-3 font-extrabold text-3xl sm:text-4xl">
            Become a Seller on ProjectX
          </h2>
          <p className="mb-8 text-indigo-100 text-lg">
            Reach millions of customers with your products!
          </p>
          <Link
            to="/marketplace"
            className="inline-block rounded-lg bg-white px-10 py-3 font-semibold text-indigo-700 shadow transition-transform hover:scale-105 hover:shadow-lg"
          >
            Start Selling
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default HomePage;
