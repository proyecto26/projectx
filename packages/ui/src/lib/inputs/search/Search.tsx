/** biome-ignore-all lint/a11y/noAutofocus: Autofocus is needed for the search input */
import { MagnifyingGlassIcon, MicrophoneIcon } from "@heroicons/react/20/solid";
import type React from "react";
import { useId } from "react";

import { classnames } from "../../../utils";

type SearchProps = {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
};

export const Search: React.FC<SearchProps> = ({
  className,
  placeholder,
  autoFocus,
  ariaLabel = "Click to speak your search terms",
  onFocus,
  onBlur,
}) => {
  const searchId = useId();
  return (
    <form className={classnames("flex items-center w-full", className)}>
      <label htmlFor={searchId} className="sr-only">
        Search
      </label>
      <div className="relative w-full group">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon
            className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-primary dark:text-slate-500 dark:group-focus-within:text-primary-tint"
            aria-hidden="true"
          />
        </div>
        <input
          type="text"
          id={searchId}
          className={classnames(
            "block w-full rounded-lg border py-2.5 pl-10 pr-10 ring-1 ring-inset transition-all sm:text-sm sm:leading-6",
            "bg-slate-100 text-slate-900 ring-transparent placeholder:text-slate-500",
            "focus:bg-white focus:ring-2 focus:ring-primary",
            "dark:bg-slate-800/50 dark:text-white dark:ring-white/10 dark:placeholder:text-slate-400",
            "dark:focus:bg-slate-900 dark:focus:ring-primary"
          )}
          placeholder={placeholder}
          required
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3"
          aria-label={ariaLabel}
        >
          <MicrophoneIcon
            className="h-4 w-4 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            aria-hidden="true"
          />
        </button>
      </div>
    </form>
  );
};

export default Search;
