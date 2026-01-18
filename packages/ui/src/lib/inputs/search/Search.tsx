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
    <form className={classnames("flex items-center", className)}>
      <label htmlFor={searchId} className="sr-only">
        Search
      </label>
      <div className="relative w-full">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <MagnifyingGlassIcon className="h-5 w-5 text-dark-gray dark:text-dark" />
        </div>
        <input
          type="text"
          id={searchId}
          className="block w-full rounded-lg border border-gray-300 bg-gray-50 px-10 py-2.5 text-gray-900 text-sm focus:border-gray-900 focus:ring-gray-900 dark:border-gray-700 dark:bg-slate-900 dark:text-white dark:placeholder-gray-400 dark:focus:border-gray-300 dark:focus:ring-gray-300"
          placeholder={placeholder}
          required
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 focus:ring-offset-2"
          aria-label={ariaLabel}
        >
          <MicrophoneIcon className="h-4 w-4 text-gray-500 hover:text-gray-900 dark:text-dark dark:hover:text-white" />
        </button>
      </div>
    </form>
  );
};

export default Search;
