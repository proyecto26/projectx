import { classnames } from "../../utils/tailwind";

export type ProgressBarColor = "success" | "primary" | "warning" | "error";

export type ProgressBarProps = {
  label: string;
  value: number;
  max?: number;
  color?: ProgressBarColor;
  className?: string;
};

const colorStyles: Record<ProgressBarColor, string> = {
  success: "bg-success",
  primary: "bg-primary",
  warning: "bg-warning",
  error: "bg-error",
};

export const ProgressBar = ({
  label,
  value,
  max = 100,
  color = "success",
  className = "",
}: ProgressBarProps) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={classnames("flex w-full flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-foreground">{label}</span>
        <span className="font-medium text-[13px] text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={classnames("h-1.5 rounded-full", colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
