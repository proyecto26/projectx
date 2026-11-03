import { useEffect, useRef } from "react";
import { NODE_REGISTRY, type NodeRegistryEntry } from "../../constants";
import type { WorkflowNodeType } from "../../types";

interface ContextMenuProps {
  x: number;
  y: number;
  allowedTypes?: WorkflowNodeType[];
  onSelect: (type: WorkflowNodeType) => void;
  onClose: () => void;
}

/** Types that should never appear in the Add Block menu (always auto-created) */
const EXCLUDED_TYPES = new Set(["start", "end"]);

/** Category definitions for the grid layout (WeWeb-inspired) */
const CATEGORIES: { label: string; types: Set<string> }[] = [
  { label: "Flow", types: new Set(["condition", "sleep", "loop"]) },
  {
    label: "Actions",
    types: new Set([
      "activity",
      "childWorkflow",
      "customCode",
      "apiCall",
      "variableChange",
    ]),
  },
  { label: "Handlers", types: new Set(["signal", "query", "update"]) },
  { label: "AI", types: new Set(["textPrompt", "aiGeneration"]) },
];

/**
 * "Add block" context menu with categorized grid layout.
 * Appears on: handle drag to empty space, double-click, right-click.
 * Inspired by WeWeb's "Add new block" popup with categories.
 */
export function ContextMenu({
  x,
  y,
  allowedTypes,
  onSelect,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  const items: NodeRegistryEntry[] = (
    allowedTypes
      ? NODE_REGISTRY.filter((c) => allowedTypes.includes(c.type))
      : NODE_REGISTRY
  ).filter((c) => !EXCLUDED_TYPES.has(c.type));

  const _itemSet = new Set(items.map((i) => i.type));

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement))
        onClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (items.length === 0) return null;

  // Build categories with their items
  const visibleCategories = CATEGORIES.map((cat) => ({
    label: cat.label,
    items: items.filter((i) => cat.types.has(i.type)),
  })).filter((cat) => cat.items.length > 0);

  const menuWidth = 280;
  const left = Math.min(x, window.innerWidth - menuWidth - 16);
  const top = Math.min(y, window.innerHeight - 400);

  return (
    <div
      ref={ref}
      className="fixed z-50 rounded-xl border border-white/[0.08] bg-[#1a1a1a]/95 p-2 shadow-2xl backdrop-blur-md"
      style={{
        left,
        top,
        width: menuWidth,
        maxHeight: "70vh",
        overflowY: "auto",
        animation: "fadeInScale 0.1s ease-out",
      }}
    >
      <p className="px-2 py-1.5 font-medium text-[10px] text-white/30 uppercase tracking-wider">
        Add new block
      </p>

      {visibleCategories.map((cat, i) => (
        <div key={cat.label}>
          {i > 0 && (
            <div className="mx-2 my-1.5 border-white/[0.06] border-t" />
          )}
          <p className="px-2 py-1 font-medium text-[9px] text-white/20 uppercase tracking-wider">
            {cat.label}
          </p>
          <div className="grid grid-cols-2 gap-1 px-0.5">
            {cat.items.map((item) => (
              <button
                key={item.type}
                type="button"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
                onClick={() => onSelect(item.type)}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px]"
                  style={{
                    backgroundColor: `${item.color}33`,
                    color: item.dot,
                  }}
                >
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium text-[11px]">
                    {item.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
