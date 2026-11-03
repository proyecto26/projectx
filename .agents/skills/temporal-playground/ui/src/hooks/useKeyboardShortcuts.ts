import { useEffect } from "react";

/**
 * Register a keyboard shortcut that fires callback when key is pressed.
 * Skips when focus is in input/textarea/contentEditable.
 * Inspired by HeroUI Studio's eS keyboard shortcut hook.
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; enabled?: boolean } = {},
) {
  const { ctrl = false, shift = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const keyMatch = e.key.toLowerCase() === key.toLowerCase();
      const modMatch =
        (e.ctrlKey || e.metaKey) === ctrl && e.shiftKey === shift;

      if (keyMatch && modMatch) {
        if (ctrl || shift) e.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback, ctrl, shift, enabled]);
}
