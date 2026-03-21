import type { LucideIcon } from "lucide-react";
import { classnames } from "../../utils/tailwind";

export type SectionHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className?: string;
};

export const SectionHeader = ({
  icon: Icon,
  title,
  subtitle,
  className = "",
}: SectionHeaderProps) => {
  return (
    <div className={classnames("flex flex-row items-center gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent">
        <Icon size={20} className="text-primary" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-[18px] text-foreground leading-tight">
          {title}
        </span>
        <span className="text-[13px] text-muted-foreground leading-tight">
          {subtitle}
        </span>
      </div>
    </div>
  );
};

export default SectionHeader;
