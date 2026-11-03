import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { classnames } from "../../utils";

export type MetricCardV2Props = ComponentProps<"div"> & {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  className?: string;
};

export const MetricCardV2 = ({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
  className,
  ...props
}: MetricCardV2Props) => {
  return (
    <div
      {...props}
      className={classnames(
        "flex w-50 flex-col gap-3 rounded-lg border border-(--border) bg-(--card) p-5",
        className,
      )}
    >
      <div className="relative flex items-start">
        {Icon && (
          <div className="flex h-10 w-11 items-center justify-center rounded-md bg-(--accent)">
            <Icon
              size={20}
              className="text-(--accent-foreground)"
              aria-hidden="true"
            />
          </div>
        )}
        {badge && <div className="absolute top-0 right-0">{badge}</div>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-medium text-(--muted-foreground) text-[11px] uppercase tracking-wide">
          {label}
        </span>
        <span className="font-medium font-mono text-(--card-foreground) text-[28px] leading-none">
          {value}
        </span>
        {subtext && (
          <span className="text-(--muted-foreground) text-xs">{subtext}</span>
        )}
      </div>
    </div>
  );
};

export default MetricCardV2;
