import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { classnames } from "../../utils";

export type NavItemProps = {
  icon: LucideIcon;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
  className?: string;
};

export const NavItem = ({
  icon: Icon,
  label,
  href,
  active,
  badge,
  onClick,
  className,
}: NavItemProps) => {
  const content = (isActive: boolean) => (
    <>
      <Icon
        size={18}
        aria-hidden="true"
        className={classnames(
          "shrink-0",
          isActive
            ? "text-indigo-600 dark:text-indigo-400"
            : "text-slate-500 dark:text-slate-400",
        )}
      />
      <span
        className={classnames(
          "flex-1 text-sm leading-none",
          isActive
            ? "font-medium text-indigo-600 dark:text-indigo-400"
            : "font-normal text-slate-500 dark:text-slate-400",
        )}
      >
        {label}
      </span>
      {badge != null && badge > 0 && (
        <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 font-semibold text-[11px] text-white leading-none">
          {badge}
        </span>
      )}
    </>
  );

  const baseClass = (isActive: boolean) =>
    classnames(
      "flex w-full items-center gap-3 rounded-md px-3.5 py-3",
      isActive && "bg-indigo-50 dark:bg-indigo-950/30",
      className,
    );

  if (href) {
    return (
      <NavLink
        to={href}
        onClick={onClick}
        className={({ isActive: routerActive }) =>
          baseClass(active !== undefined ? active : routerActive)
        }
      >
        {({ isActive: routerActive }) =>
          content(active !== undefined ? active : routerActive)
        }
      </NavLink>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass(!!active)}>
      {content(!!active)}
    </button>
  );
};

export default NavItem;
