import type { ComponentProps } from "react";
import { classnames } from "../../utils";

export type TableRowProps = ComponentProps<"div"> & {
  rank: number;
  name: string;
  units: number | string;
  revenue: string;
  className?: string;
};

export const TableRow = ({
  rank,
  name,
  units,
  revenue,
  className,
  ...props
}: TableRowProps) => {
  return (
    <div
      {...props}
      className={classnames(
        "flex w-[400px] items-center gap-3 px-4 py-3",
        "border-(--border) border-b",
        className,
      )}
    >
      <div
        role="img"
        className={classnames(
          "flex h-7 w-7 shrink-0 items-center justify-center",
          "rounded-[6px] bg-(--primary)",
        )}
        aria-label={`Rank ${rank}`}
      >
        <span className="font-semibold text-(--primary-foreground) text-[12px] leading-none">
          {rank}
        </span>
      </div>
      <span className="flex-1 truncate text-(--foreground) text-sm">
        {name}
      </span>
      <span className="w-[100px] shrink-0 text-right text-(--muted-foreground) text-sm">
        {units}
      </span>
      <span className="w-[100px] shrink-0 text-right font-semibold text-(--foreground) text-sm">
        {revenue}
      </span>
    </div>
  );
};

export default TableRow;
