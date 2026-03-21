import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { NODE_REGISTRY } from "../../constants";
import { useWorkflowStore } from "../../store/workflow-store";
import type { WorkflowNodeType } from "../../types";

/**
 * Compact vertical toolbar for quickly adding nodes.
 * Floating on the left side of the canvas with glass-morphism styling.
 * Supports click-to-add (viewport center) and drag-to-place.
 * Inspired by HeroUI Studio's vertical toolbar.
 */
export function VerticalToolbar() {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useWorkflowStore((s) => s.addNode);

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleClick = useCallback(
    (type: WorkflowNodeType) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      addNode(type, position);
    },
    [screenToFlowPosition, addNode],
  );

  // Group node types for visual separation (exclude start/end/state — auto-created)
  const flowNodes = NODE_REGISTRY.filter((n) =>
    ["activity", "condition", "sleep", "childWorkflow", "loop"].includes(
      n.type,
    ),
  );
  const handlerNodes = NODE_REGISTRY.filter((n) =>
    ["signal", "query", "update"].includes(n.type),
  );
  const actionNodes = NODE_REGISTRY.filter((n) =>
    ["customCode", "variableChange", "apiCall"].includes(n.type),
  );
  const aiNodes = NODE_REGISTRY.filter((n) =>
    ["textPrompt", "aiGeneration"].includes(n.type),
  );

  const renderGroup = (nodes: typeof NODE_REGISTRY, _label: string) => (
    <>
      {nodes.map((item) => (
        <button
          key={item.type}
          type="button"
          draggable
          aria-label={item.label}
          title={`${item.label} — ${item.desc}`}
          className="group relative flex h-9 w-9 cursor-grab items-center justify-center rounded-lg text-white/50 transition-all hover:bg-white/10 hover:text-white active:cursor-grabbing active:bg-white/15"
          onClick={() => handleClick(item.type)}
          onDragStart={(e) => handleDragStart(e, item.type)}
        >
          <span className="text-base" style={{ color: item.dot }}>
            {item.icon}
          </span>
          {/* Tooltip on hover */}
          <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[#1a1a1a] px-2 py-1 text-white/80 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            {item.label}
          </span>
        </button>
      ))}
    </>
  );

  return (
    <div className="absolute top-1/2 left-3 z-10 flex -translate-y-1/2 flex-col gap-0.5 rounded-xl border border-white/[0.08] bg-[#1a1a1a]/90 p-1.5 shadow-2xl backdrop-blur-md">
      {renderGroup(flowNodes, "Flow")}
      <div className="mx-1.5 my-0.5 border-white/[0.06] border-t" />
      {renderGroup(handlerNodes, "Handlers")}
      <div className="mx-1.5 my-0.5 border-white/[0.06] border-t" />
      {renderGroup(actionNodes, "Actions")}
      <div className="mx-1.5 my-0.5 border-white/[0.06] border-t" />
      {renderGroup(aiNodes, "AI")}
    </div>
  );
}
