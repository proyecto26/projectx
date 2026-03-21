import { useMemo } from "react";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { useWorkflowStore } from "../../store/workflow-store";

export function Toolbar() {
  const { nodes, edges, activeSource, clearCanvas, autoArrange } =
    useWorkflowStore();
  const { undo, redo } = useUndoRedo();

  const info = useMemo(() => {
    if (nodes.length === 0)
      return "Empty canvas \u2014 drag nodes or load a preset";
    const starts = nodes.filter((n) => n.type === "start");
    const name =
      starts.length > 0
        ? (starts[0]?.data as Record<string, string>).workflowName
        : "unnamed";
    let label = `${name} \u2014 ${nodes.length} nodes, ${edges.length} connections`;
    if (activeSource?.type === "existing")
      label += ` \u2014 \u270F\uFE0F editing ${activeSource.path}`;
    else if (activeSource?.type === "preset") label += " \u2014 from template";
    else if (nodes.length > 0) label += " \u2014 new workflow";
    return label;
  }, [nodes, edges, activeSource]);

  return (
    <div className="flex items-center justify-between border-border border-b bg-bg2 px-4 py-2">
      <div className="text-[11px] text-text-dim">{info}</div>
      <div className="flex gap-1">
        <button
          type="button"
          className="toolbar-btn"
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>
        <button type="button" className="toolbar-btn" onClick={clearCanvas}>
          Clear
        </button>
        <button type="button" className="toolbar-btn" onClick={autoArrange}>
          Auto-arrange
        </button>
      </div>
    </div>
  );
}
