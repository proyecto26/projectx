import { Plus, Star } from "lucide-react";
import type { ComponentProps, MouseEvent } from "react";
import { classnames } from "../../utils";

export type ProductCardProps = ComponentProps<"div"> & {
  productName: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  imageSrc?: string;
  imageAlt?: string;
  freeShipping?: boolean;
  onQuickAdd?: () => void;
  className?: string;
};

export const ProductCard = ({
  productName,
  price,
  originalPrice,
  rating = 0,
  reviewCount,
  imageSrc,
  imageAlt,
  freeShipping = false,
  onQuickAdd,
  className,
  ...props
}: ProductCardProps) => {
  const clampedRating = Math.min(5, Math.max(0, Math.round(rating)));

  return (
    <div
      {...props}
      className={classnames(
        "flex flex-col overflow-hidden rounded-lg border border-(--border) bg-(--card)",
        className,
      )}
    >
      <div className="relative h-[200px] w-full overflow-hidden bg-(--muted)">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={imageAlt ?? productName}
            className="h-full w-full object-cover"
          />
        ) : null}
        {onQuickAdd && (
          <button
            type="button"
            aria-label="Add to cart"
            onClick={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd();
            }}
            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-(--primary) text-white shadow-md transition-transform hover:scale-110 active:scale-95"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="font-medium text-(--card-foreground) text-sm">
          {productName}
        </p>
        {rating > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                // biome-ignore lint/suspicious/noArrayIndexKey: stable index for star rating
                key={i}
                size={14}
                className={classnames(
                  i < clampedRating
                    ? "oklch(0.78 0.17 75)) oklch(0.78 0.17 75)) fill-(--warning, text-(--warning,"
                    : "fill-transparent text-(--muted-foreground)",
                )}
                aria-hidden="true"
              />
            ))}
            {reviewCount !== undefined && (
              <span className="text-(--muted-foreground) text-xs">
                ({reviewCount})
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-(--card-foreground)">
            ${price.toFixed(2)}
          </span>
          {originalPrice !== undefined && originalPrice > price && (
            <span className="text-(--muted-foreground) text-sm line-through">
              ${originalPrice.toFixed(2)}
            </span>
          )}
        </div>
        {freeShipping && (
          <span className="oklch(0.65 0.15 145)) font-medium text-(--success, text-xs">
            Free shipping
          </span>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
