import type React from "react";
import { Link } from "react-router";
import { classnames } from "../../utils/tailwind";

export type CategoryChipProps = {
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  href?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
};

export const CategoryChip = ({
  label,
  icon: Icon,
  href,
  selected = false,
  onClick,
  className,
}: CategoryChipProps) => {
  const baseStyles = classnames(
    "inline-flex items-center gap-2 rounded-full border px-4 py-2.5",
    "text-[13px] font-medium transition-colors",
    selected
      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground,var(--foreground))]"
      : "border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--accent)/10]",
    className,
  );

  const content = (
    <>
      {Icon && (
        <Icon
          size={16}
          className={
            selected
              ? "text-[var(--accent-foreground,var(--foreground))]"
              : "text-[var(--muted-foreground)]"
          }
        />
      )}
      {label}
    </>
  );

  if (href) {
    return (
      <Link to={href} className={baseStyles} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseStyles} onClick={onClick}>
      {content}
    </button>
  );
};

export default CategoryChip;
