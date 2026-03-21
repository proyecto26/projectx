import { NODE_REGISTRY } from "../../constants";
import type { WorkflowNodeType } from "../../types";

function onDragStart(e: React.DragEvent, type: WorkflowNodeType) {
  e.dataTransfer.setData("application/reactflow", type);
  e.dataTransfer.effectAllowed = "move";
}

export function NodeTypeList() {
  return (
    <div className="section border-border border-b px-4 py-3">
      <div className="section-title">Node Types</div>
      <div className="node-list">
        {NODE_REGISTRY.map((n) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: draggable palette item
          <div
            key={n.type}
            className="node-item"
            draggable
            onDragStart={(e) => onDragStart(e, n.type)}
          >
            <span className="node-dot" style={{ background: n.dot }} />
            <span>{n.label}</span>
            <span className="desc">{n.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
