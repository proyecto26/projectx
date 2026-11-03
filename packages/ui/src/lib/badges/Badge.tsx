import type { ComponentProps } from "react";
import { classnames } from "../../utils/tailwind";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "urgent"
  | "count";

export type BadgeProps = Omit<ComponentProps<"span">, "children"> & {
  variant?: BadgeVariant;
  /** Label text shown next to the dot/icon. Not used for "count" variant. */
  label?: string;
  /** Numeric value rendered inside a count badge. Only used for "count" variant. */
  count?: number;
};

// Inline triangle-alert SVG matching lucide-react's 12px design
const TriangleAlertIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </svg>
);

const variantStyles: Record<
  BadgeVariant,
  { wrapper: string; dot?: string; icon?: boolean }
> = {
  success: {
    wrapper:
      "bg-[color-mix(in_srgb,var(--color-success,#0f9d58)_15%,white)] text-[var(--color-success,#0f9d58)]",
    dot: "bg-[var(--color-success,#0f9d58)]",
  },
  warning: {
    wrapper:
      "bg-[color-mix(in_srgb,var(--color-warning,#fbbc05)_15%,white)] text-[var(--color-warning,#fbbc05)]",
    dot: "bg-[var(--color-warning,#fbbc05)]",
  },
  error: {
    wrapper: "bg-[#FEE2E2] text-[var(--color-danger,#d93025)]",
    dot: "bg-[var(--color-danger,#d93025)]",
  },
  info: {
    wrapper: "bg-blue-100 text-blue-700",
    dot: "bg-blue-700",
  },
  urgent: {
    wrapper:
      "bg-[color-mix(in_srgb,var(--color-warning,#fbbc05)_15%,white)] text-[var(--color-warning,#fbbc05)]",
    icon: true,
  },
  count: {
    wrapper:
      "bg-[var(--color-danger,#d93025)] text-white justify-center min-w-[20px]",
  },
};

export const Badge = ({
  variant = "success",
  label,
  count,
  className,
  ...props
}: BadgeProps) => {
  const styles = variantStyles[variant];

  if (variant === "count") {
    return (
      <span
        {...props}
        className={classnames(
          "inline-flex items-center rounded-full px-2 py-0.5",
          "font-semibold text-[11px] leading-none",
          styles.wrapper,
          className,
        )}
      >
        {count ?? 0}
      </span>
    );
  }

  return (
    <span
      {...props}
      className={classnames(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "font-medium text-xs leading-none",
        styles.wrapper,
        className,
      )}
    >
      {styles.icon ? (
        <TriangleAlertIcon />
      ) : (
        <span
          className={classnames(
            "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
            styles.dot,
          )}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
};

export default Badge;
