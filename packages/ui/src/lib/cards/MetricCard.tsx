import type { LucideIcon } from "lucide-react";
import { TrendingUp } from "lucide-react";
import type { ComponentProps } from "react";
import { classnames } from "../../utils";

export type MetricCardProps = ComponentProps<"div"> & {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trendLabel?: string;
  trendIcon?: LucideIcon;
  className?: string;
};

export const MetricCard = ({
  label,
  value,
  icon: Icon,
  trendLabel,
  trendIcon: TrendIcon = TrendingUp,
  className,
  ...props
}: MetricCardProps) => {
  return (
    <div
      {...props}
      className={classnames(
        "flex w-60 flex-col gap-3 rounded-lg border border-(--border) bg-(--card) p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-(--muted-foreground) text-xs">
          {label}
        </span>
        {Icon && (
          <Icon
            size={18}
            className="text-(--muted-foreground)"
            aria-hidden="true"
          />
        )}
      </div>
      <span className="font-medium font-mono text-(--card-foreground) text-[28px] leading-none">
        {value}
      </span>
      {trendLabel && (
        <div className="flex items-center gap-1">
          <TrendIcon
            size={14}
            className="oklch(0.65 0.15 145)) text-(--success,"
            aria-hidden="true"
          />
          <span className="oklch(0.65 0.15 145)) font-medium text-(--success, text-xs">
            {trendLabel}
          </span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
