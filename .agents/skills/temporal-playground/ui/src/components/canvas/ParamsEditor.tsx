import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { WorkflowParam } from "../../types/nodes";
import { CodeMirrorField } from "../editor/CodeMirrorField";

interface ParamsEditorProps {
  params: WorkflowParam[];
  onChange: (params: WorkflowParam[]) => void;
}

export interface ParamsEditorHandle {
  triggerAdd: () => void;
}

/**
 * Positional-args parameter editor for the Start block.
 *
 * Left panel:  Ordered list of args (#1, #2, …) with name + type badge.
 *              Click to select, three-dot menu to delete.
 * Right panel: Edit name, type, required, description, and default value
 *              (CodeMirror for complex defaults like objects).
 */
export const ParamsEditor = forwardRef<ParamsEditorHandle, ParamsEditorProps>(
  function ParamsEditor({ params, onChange }, ref) {
    const [showAddInput, setShowAddInput] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("");
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [menuIndex, setMenuIndex] = useState<number | null>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Expose triggerAdd so the parent "+" button can open the add form
    useImperativeHandle(ref, () => ({
      triggerAdd: () => {
        setShowAddInput(true);
        setTimeout(() => nameInputRef.current?.focus(), 50);
      },
    }));

    const addParam = useCallback(() => {
      const name = newName.trim();
      if (!name || params.some((p) => p.name === name)) return;
      const newParams = [
        ...params,
        {
          name,
          type: newType.trim() || "unknown",
          required: true,
          description: "",
          defaultValue: "",
        },
      ];
      onChange(newParams);
      setNewName("");
      setNewType("");
      setShowAddInput(false);
      setEditingIndex(newParams.length - 1);
    }, [newName, newType, params, onChange]);

    const removeParam = useCallback(
      (index: number) => {
        onChange(params.filter((_, i) => i !== index));
        if (editingIndex === index) setEditingIndex(null);
        else if (editingIndex !== null && editingIndex > index)
          setEditingIndex(editingIndex - 1);
        setMenuIndex(null);
      },
      [params, onChange, editingIndex],
    );

    const updateParam = useCallback(
      (index: number, patch: Partial<WorkflowParam>) => {
        onChange(params.map((p, i) => (i === index ? { ...p, ...patch } : p)));
      },
      [params, onChange],
    );

    // Drag reorder
    const moveParam = useCallback(
      (from: number, to: number) => {
        if (from === to || to < 0 || to >= params.length) return;
        const next = [...params];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        onChange(next);
        setEditingIndex(to);
      },
      [params, onChange],
    );

    const editingParam = editingIndex !== null ? params[editingIndex] : null;

    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* LEFT PANEL — positional args list */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Add input row */}
          {showAddInput && (
            <div className="flex flex-col gap-1.5 border-white/[0.06] border-b px-3 py-2">
              <input
                ref={nameInputRef}
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addParam();
                  if (e.key === "Escape") {
                    setShowAddInput(false);
                    setNewName("");
                    setNewType("");
                  }
                }}
                placeholder="Param name"
                className="w-full rounded-md border border-blue-500/40 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-blue-400/30 focus:border-blue-500/60 focus:outline-none"
              />
              <input
                type="text"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addParam();
                  if (e.key === "Escape") {
                    setShowAddInput(false);
                    setNewName("");
                    setNewType("");
                  }
                }}
                placeholder="Type (e.g. LoginWorkflowData)"
                className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px] text-white/80 placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none"
              />
              {newName.trim() &&
                params.some((p) => p.name === newName.trim()) && (
                  <p className="flex items-center gap-1 text-[9px] text-orange-400/70">
                    <span className="text-[11px]">ⓘ</span> Name must be unique
                  </p>
                )}
            </div>
          )}

          {/* Args list */}
          <div className="flex-1 overflow-y-auto">
            {params.length === 0 && !showAddInput && (
              <p className="px-3 py-6 text-center text-[10px] text-white/20 italic">
                No parameters defined.
                <br />
                Click + to add a positional arg.
              </p>
            )}
            {params.map((param, i) => (
              // biome-ignore lint/a11y/useKeyWithClickEvents: internal playground component
              // biome-ignore lint/a11y/noStaticElementInteractions: internal playground component
              <div
                key={`${param.name}-${i}`}
                className={`relative flex cursor-pointer items-center gap-2 border-white/[0.04] border-b px-3 py-2.5 transition-colors ${
                  editingIndex === i
                    ? "bg-blue-500/[0.08] text-white"
                    : "text-white/70 hover:bg-white/[0.04] hover:text-white/90"
                }`}
                onClick={() => {
                  setEditingIndex(editingIndex === i ? null : i);
                  setMenuIndex(null);
                }}
              >
                {/* Position badge */}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/[0.06] font-mono text-[9px] text-white/40">
                  #{i + 1}
                </span>

                {/* Name + type */}
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <span className="truncate text-[12px]">{param.name}</span>
                  {param.type && param.type !== "unknown" && (
                    <span className="max-w-[120px] truncate rounded bg-blue-500/10 px-1.5 py-0.5 font-mono text-[9px] text-blue-400/70">
                      {param.type}
                    </span>
                  )}
                  {param.required && (
                    <span className="text-[8px] text-orange-400/60">*</span>
                  )}
                </div>

                {/* Reorder buttons */}
                <div className="flex shrink-0 flex-col gap-0">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveParam(i, i - 1);
                    }}
                    className="h-3 text-[9px] text-white/15 leading-none hover:text-white/50 disabled:opacity-20"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === params.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveParam(i, i + 1);
                    }}
                    className="h-3 text-[9px] text-white/15 leading-none hover:text-white/50 disabled:opacity-20"
                  >
                    ▼
                  </button>
                </div>

                {/* Three-dot menu */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuIndex(menuIndex === i ? null : i);
                  }}
                  className="shrink-0 px-0.5 text-sm text-white/20 leading-none transition-colors hover:text-white/60"
                >
                  ⋮
                </button>

                {/* Dropdown */}
                {menuIndex === i && (
                  <div
                    role="menu"
                    className="absolute top-full right-2 z-10 mt-0.5 min-w-[100px] rounded-lg border border-white/[0.1] bg-[#252525] py-1 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[11px] text-red-400/80 transition-colors hover:bg-red-500/10"
                      onClick={() => removeParam(i)}
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — param detail editor */}
        {editingParam && editingIndex !== null && (
          <div className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-white/[0.06] border-l">
            {/* Header */}
            <div className="flex items-center gap-2 border-white/[0.06] border-b px-3 py-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-500/15 font-mono text-[9px] text-blue-400">
                #{editingIndex + 1}
              </span>
              <span className="flex-1 truncate font-medium text-[12px] text-white/90">
                {editingParam.name}
              </span>
              <button
                type="button"
                className="text-sm text-white/30 leading-none transition-colors hover:text-white"
                onClick={() => setEditingIndex(null)}
              >
                ×
              </button>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-3 px-3 py-3">
              {/* Name + Required */}
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[9px] text-white/30 uppercase tracking-wider">
                  Arg name
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingParam.name}
                    onChange={(e) =>
                      updateParam(editingIndex, { name: e.target.value })
                    }
                    className="min-w-0 flex-1 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 font-mono text-[11px] text-white/80 focus:border-blue-500/50 focus:outline-none"
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-[9px] text-white/30">Req</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateParam(editingIndex, {
                          required: !editingParam.required,
                        })
                      }
                      className={`relative h-[18px] w-8 rounded-full transition-colors ${
                        editingParam.required ? "bg-blue-500" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-transform ${
                          editingParam.required ? "left-[15px]" : "left-[2px]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Type */}
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[9px] text-white/30 uppercase tracking-wider">
                  Type
                </span>
                <input
                  type="text"
                  value={editingParam.type}
                  onChange={(e) =>
                    updateParam(editingIndex, { type: e.target.value })
                  }
                  placeholder="string, number, MyType, etc."
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 font-mono text-[11px] text-white/80 placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[9px] text-white/30 uppercase tracking-wider">
                  Description
                </span>
                <input
                  type="text"
                  value={editingParam.description}
                  onChange={(e) =>
                    updateParam(editingIndex, { description: e.target.value })
                  }
                  placeholder="What this argument is for"
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] text-white/80 placeholder:text-white/15 focus:border-blue-500/50 focus:outline-none"
                />
              </div>

              {/* Default value — CodeMirror for complex objects */}
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[9px] text-white/30 uppercase tracking-wider">
                  Default value
                </span>
                <CodeMirrorField
                  value={editingParam.defaultValue}
                  onChange={(val) =>
                    updateParam(editingIndex, { defaultValue: val })
                  }
                  placeholder={'{ interval: "1m", max: 10 }'}
                  minHeight="60px"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
