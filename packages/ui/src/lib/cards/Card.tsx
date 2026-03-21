import type { ComponentProps, ReactNode } from "react";
import { classnames } from "../../utils";

export type CardProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export const Card = ({
  title,
  description,
  children,
  className,
  ...props
}: CardProps) => {
  return (
    <div
      {...props}
      className={classnames(
        "flex w-80 flex-col gap-4 rounded-lg border border-(--border) bg-(--card) p-5",
        className,
      )}
    >
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && (
            <h3 className="font-semibold text-(--card-foreground) text-base">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-(--muted-foreground) text-sm">{description}</p>
          )}
        </div>
      )}
      {children && <div>{children}</div>}
    </div>
  );
};

export default Card;
