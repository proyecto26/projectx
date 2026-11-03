import type { NodeProps } from "@xyflow/react";
import { CustomHandle } from "../components/canvas/CustomHandle";
import { getNodeConfig, getNodeSummary } from "../constants";
import { useWorkflowStore } from "../store/workflow-store";
import type { WorkflowNodeType } from "../types";

/**
 * Compact node - shows icon + label + short summary on canvas.
 * Click to open the detail panel on the right.
 */
export function CompactNode({ id, data, type, selected }: NodeProps) {
  const nodeType = type as WorkflowNodeType;
  const config = getNodeConfig(nodeType);
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId);
  const isActive = useWorkflowStore((s) => s.selectedNodeId === id);
  const handles = config?.handles ?? [];
  const summary = getNodeSummary(nodeType, data as Record<string, unknown>);

  return (
    <div
      role="treeitem"
      tabIndex={0}
      className="compact-node group"
      style={{
        borderColor: isActive
          ? (config?.dot ?? "#7aa2f7")
          : selected
            ? `${config?.color ?? "#555"}cc`
            : "rgba(255,255,255,0.06)",
        boxShadow: isActive
          ? `0 0 16px ${config?.dot ?? "#7aa2f7"}22`
          : undefined,
      }}
      onClick={() => setSelectedNodeId(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") setSelectedNodeId(id);
      }}
    >
      {handles.map((h) => (
        <CustomHandle key={`${h.type}-${h.id}`} {...h} />
      ))}
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
        style={{
          backgroundColor: `${config?.color ?? "#555"}33`,
          color: config?.dot ?? "#fff",
        }}
      >
        {config?.icon ?? "?"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-[12px] text-white/90">
          {config?.label ?? type}
        </div>
        <div className="truncate text-[10px] text-white/35">{summary}</div>
      </div>
      <span className="text-[10px] text-white/20 transition-colors group-hover:text-white/50">
        ›
      </span>
    </div>
  );
}
