import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { classnames } from "../../../utils";

export type SearchBarProps = Omit<ComponentProps<"input">, "onChange"> & {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
};

export const SearchBar = ({
  placeholder = "Search...",
  value,
  onChange,
  onSubmit,
  className,
  ...props
}: SearchBarProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSubmit?.();
    }
  };

  return (
    <div
      className={classnames(
        "flex h-11 items-center gap-2.5 rounded-(--radius-md)",
        "border border-(--input-border) bg-(--input)",
        "w-[400px] px-4 py-2.5",
        className,
      )}
    >
      <Search
        size={18}
        className="shrink-0 text-(--muted-foreground)"
        aria-hidden="true"
      />
      <input
        {...props}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        className={classnames(
          "flex-1 bg-transparent text-(--foreground) text-sm",
          "placeholder:text-(--muted-foreground)",
          "border-none outline-none focus:outline-none",
        )}
      />
    </div>
  );
};

export default SearchBar;
