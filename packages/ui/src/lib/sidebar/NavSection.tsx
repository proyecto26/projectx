import type { ReactNode } from "react";
import { classnames } from "../../utils";

export type NavSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export const NavSection = ({ title, children, className }: NavSectionProps) => {
  return (
    <div className={classnames("flex flex-col gap-1", className)}>
      <p className="px-3.5 font-semibold text-[11px] text-slate-500 uppercase tracking-wide dark:text-slate-400">
        {title}
      </p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
};

export default NavSection;
