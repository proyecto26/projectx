import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router";
import { classnames } from "../../utils/tailwind";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={classnames("flex items-center gap-2", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={item.label} className="flex items-center gap-2">
            {isLast ? (
              <span
                aria-current="page"
                className="font-medium text-[13px] text-[var(--foreground)]"
              >
                {item.label}
              </span>
            ) : (
              <NavLink
                to={item.href ?? "/"}
                className="text-[13px] text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
              >
                {item.label}
              </NavLink>
            )}
            {!isLast && (
              <ChevronRight
                size={14}
                className="shrink-0 text-[var(--muted-foreground)]"
                aria-hidden="true"
              />
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
