import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import type { ProductDto } from "@projectx/models";
import { Breadcrumb, Button, CategoryChip, ProductCard } from "@projectx/ui";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useCart } from "react-use-cart";
import { MarketplaceHomepage } from "./MarketplaceHomepage";

export type MarketplacePageProps = {
  products: ProductDto[];
  categories?: string[];
  initialCategory?: string;
  initialSearch?: string;
};

const BRANDS = ["Apple", "Samsung", "Google", "OnePlus"];
const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

type FilterSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-[var(--border)] border-b py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between font-semibold text-[var(--foreground)] text-sm"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

type FiltersState = {
  brands: string[];
  minPrice: string;
  maxPrice: string;
  minRating: number | null;
  sort: string;
};

type SidebarFiltersProps = {
  filters: FiltersState;
  onFiltersChange: (filters: FiltersState) => void;
};

function SidebarFilters({ filters, onFiltersChange }: SidebarFiltersProps) {
  function toggleBrand(brand: string) {
    const next = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand];
    onFiltersChange({ ...filters, brands: next });
  }

  return (
    <div className="text-sm">
      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minPrice}
            onChange={(e) =>
              onFiltersChange({ ...filters, minPrice: e.target.value })
            }
            className="input input-sm input-bordered w-full border-[var(--input-border)] bg-[var(--input)] text-[var(--foreground)]"
          />
          <span className="text-[var(--muted-foreground)]">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxPrice}
            onChange={(e) =>
              onFiltersChange({ ...filters, maxPrice: e.target.value })
            }
            className="input input-sm input-bordered w-full border-[var(--input-border)] bg-[var(--input)] text-[var(--foreground)]"
          />
        </div>
      </FilterSection>

      <FilterSection title="Brand">
        {BRANDS.map((brand) => (
          <label
            key={brand}
            className="flex cursor-pointer items-center gap-2 text-[var(--foreground)]"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={filters.brands.includes(brand)}
              onChange={() => toggleBrand(brand)}
            />
            {brand}
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Rating">
        {[4, 3, 2, 1].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() =>
              onFiltersChange({
                ...filters,
                minRating: filters.minRating === rating ? null : rating,
              })
            }
            className={`flex w-full items-center gap-2 rounded px-2 py-1 transition-colors ${
              filters.minRating === rating
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface)]"
            }`}
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={13}
                  className={
                    star <= rating
                      ? "fill-[var(--rating)] text-[var(--rating)]"
                      : "fill-[var(--border)] text-[var(--border)]"
                  }
                />
              ))}
            </div>
            <span className="text-xs">& Up</span>
          </button>
        ))}
      </FilterSection>
    </div>
  );
}

type MarketplaceProductCardProps = {
  product: ProductDto;
  onAddToCart: (product: ProductDto) => void;
  index: number;
};

function MarketplaceProductCard({
  product,
  onAddToCart,
  index,
}: MarketplaceProductCardProps) {
  // Derived mock values (the model doesn't have rating/reviewCount/originalPrice)
  const rating = 3.5 + (product.id % 3) * 0.5;
  const reviewCount = 100 + ((product.id * 137) % 2000);
  const hasDiscount = product.id % 3 === 0;
  const originalPrice = hasDiscount ? product.estimatedPrice * 1.2 : undefined;
  const hasFreeShipping = product.id % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="relative h-full transition-shadow hover:shadow-md"
    >
      <Link to={`/product/${product.id}`} className="block h-full no-underline">
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

export const MarketplacePage: React.FC<MarketplacePageProps> = ({
  products,
  categories = [],
  initialCategory,
}) => {
  const { addItem } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialCategory,
  );

  const [filters, setFilters] = useState<FiltersState>({
    brands: [],
    minPrice: "",
    maxPrice: "",
    minRating: null,
    sort: "relevance",
  });

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;

  function handleCategorySelect(cat: string | undefined) {
    setSelectedCategory(cat);
    setCurrentPage(1);
    const next = new URLSearchParams(searchParams);
    if (cat) {
      next.set("category", cat);
    } else {
      next.delete("category");
    }
    setSearchParams(next, { preventScrollReset: true });
  }

  const handleAddToCart = (product: ProductDto) => {
    addItem({
      id: String(product.id),
      name: product.name,
      price: product.estimatedPrice,
      currency: "USD",
      image: product.imageUrl,
      quantity: 1,
    });
  };

  // Category filtering is handled server-side via the API query param.
  // Only apply client-side price/sort filters here.
  const filteredProducts = useMemo(() => {
    let result = Array.isArray(products) ? [...products] : [];

    if (filters.minPrice !== "") {
      result = result.filter(
        (p) => p.estimatedPrice >= Number(filters.minPrice),
      );
    }
    if (filters.maxPrice !== "") {
      result = result.filter(
        (p) => p.estimatedPrice <= Number(filters.maxPrice),
      );
    }

    if (filters.sort === "price-asc") {
      result.sort((a, b) => a.estimatedPrice - b.estimatedPrice);
    } else if (filters.sort === "price-desc") {
      result.sort((a, b) => b.estimatedPrice - a.estimatedPrice);
    }

    return result;
  }, [products, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function handlePageChange(page: number) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const filtersPanel = (
    <SidebarFilters filters={filters} onFiltersChange={setFilters} />
  );

  return (
    <>
      {/* Desktop layout — lg and above: break out of container constraints */}
      <div className="hidden lg:-mx-[calc((100vw-100%)/2+1rem)] lg:-mt-8 lg:-mb-8 lg:block lg:w-screen">
        <MarketplaceHomepage
          products={products}
          categories={categories}
          onCategorySelect={handleCategorySelect}
          selectedCategory={selectedCategory}
          onAddToCart={handleAddToCart}
        />
      </div>

      {/* Mobile/Tablet layout — below lg */}
      <div className="block lg:hidden">
        <div className="container mx-auto px-4 py-6">
          {/* Categories horizontal scroll */}
          {categories.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-[var(--foreground)] text-lg">
                  Shop by Category
                </h2>
                <button
                  type="button"
                  onClick={() => handleCategorySelect(undefined)}
                  className="font-medium text-[var(--primary)] text-sm hover:underline"
                >
                  See all
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((cat) => (
                  <CategoryChip
                    key={cat}
                    label={cat}
                    selected={selectedCategory === cat}
                    onClick={() =>
                      handleCategorySelect(
                        selectedCategory === cat ? undefined : cat,
                      )
                    }
                    className="shrink-0"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb */}
          <Breadcrumb
            className="mb-4"
            items={[
              { label: "Home", href: "/" },
              ...(selectedCategory
                ? [
                    {
                      label: selectedCategory,
                      href: `/marketplace?category=${encodeURIComponent(selectedCategory)}`,
                    },
                  ]
                : [{ label: "All Products" }]),
            ]}
          />

          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <aside className="hidden w-60 shrink-0 lg:block">
              <div className="sticky top-4">
                <h2 className="mb-2 flex items-center gap-2 font-bold text-[var(--foreground)] text-sm">
                  <SlidersHorizontal size={16} />
                  Filters
                </h2>
                {filtersPanel}
              </div>
            </aside>

            {/* Main content */}
            <div className="min-w-0 flex-1">
              {/* Top bar */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[var(--muted-foreground)] text-xs sm:text-sm">
                    <strong className="text-[var(--foreground)]">
                      {filteredProducts.length}
                    </strong>{" "}
                    results
                    {selectedCategory && (
                      <span className="ml-1">
                        in{" "}
                        <span className="font-medium text-[var(--foreground)]">
                          {selectedCategory}
                        </span>
                      </span>
                    )}
                  </span>
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <label
                    htmlFor="sort-select"
                    className="text-[var(--muted-foreground)]"
                  >
                    Sort:
                  </label>
                  <div className="relative">
                    <select
                      id="sort-select"
                      value={filters.sort}
                      onChange={(e) =>
                        setFilters({ ...filters, sort: e.target.value })
                      }
                      className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] py-1.5 pr-8 pl-3 text-[var(--foreground)] text-sm focus:outline-none"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[var(--muted-foreground)]"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile filter pills - horizontal scrollable row (hidden on lg+) */}
              <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-medium text-[var(--foreground)] text-xs hover:bg-[var(--surface)]"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      sort:
                        f.sort === "price-asc"
                          ? "price-desc"
                          : f.sort === "price-desc"
                            ? "relevance"
                            : "price-asc",
                    }))
                  }
                >
                  <ChevronDown size={12} />
                  Sort
                </button>
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 font-medium text-[var(--foreground)] text-xs hover:bg-[var(--surface)]"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <SlidersHorizontal size={12} />
                  Filters
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      maxPrice: f.maxPrice === "50" ? "" : "50",
                      minPrice: "",
                    }))
                  }
                  className={`shrink-0 rounded-full border px-3 py-1.5 font-medium text-xs transition-colors ${
                    filters.maxPrice === "50"
                      ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                  }`}
                >
                  Under $50
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFilters((f) => ({
                      ...f,
                      maxPrice: f.maxPrice === "100" ? "" : "100",
                      minPrice: "",
                    }))
                  }
                  className={`shrink-0 rounded-full border px-3 py-1.5 font-medium text-xs transition-colors ${
                    filters.maxPrice === "100"
                      ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                      : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                  }`}
                >
                  Under $100
                </button>
                {[4, 3].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        minRating: f.minRating === rating ? null : rating,
                      }))
                    }
                    className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 font-medium text-xs transition-colors ${
                      filters.minRating === rating
                        ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                        : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    <Star
                      size={11}
                      className="fill-[var(--rating)] text-[var(--rating)]"
                    />
                    {rating}+ Star
                  </button>
                ))}
              </div>

              {/* Product Grid */}
              {paginatedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
                  <ShoppingCart size={48} className="mb-4 opacity-30" />
                  <p className="font-medium text-lg">No products found</p>
                  <p className="mt-1 text-sm">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
                  {paginatedProducts.map((product, index) => (
                    <MarketplaceProductCard
                      key={product.id}
                      product={product}
                      onAddToCart={handleAddToCart}
                      index={index}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                    className="btn btn-sm btn-ghost disabled:opacity-40"
                  >
                    Previous
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => handlePageChange(page)}
                        className={`btn btn-sm ${
                          page === currentPage
                            ? "btn-primary"
                            : "btn-ghost text-[var(--muted-foreground)]"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="btn btn-sm btn-ghost disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile filter drawer */}
          <Dialog
            open={mobileFiltersOpen}
            onClose={() => setMobileFiltersOpen(false)}
            className="relative z-50 lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40"
              aria-hidden="true"
            />

            {/* Slide-over panel */}
            <div className="fixed inset-y-0 right-0 flex">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <DialogPanel className="relative flex h-full w-80 max-w-[90vw] flex-col overflow-y-auto bg-[var(--card)] px-5 pb-6 shadow-xl">
                  <div className="flex items-center justify-between py-4">
                    <DialogTitle className="font-bold text-[var(--foreground)] text-sm">
                      Filters
                    </DialogTitle>
                    <button
                      type="button"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {filtersPanel}
                  <div className="mt-6">
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() => setMobileFiltersOpen(false)}
                    >
                      Show {filteredProducts.length} results
                    </Button>
                  </div>
                </DialogPanel>
              </motion.div>
            </div>
          </Dialog>
        </div>
      </div>
    </>
  );
};
