import type { HandleProps } from "@xyflow/react";
import type { ReactNode } from "react";
import { CustomHandle } from "../components/canvas/CustomHandle";

interface BaseNodeProps {
  borderColor: string;
  headerBg: string;
  headerText: string;
  handles?: HandleProps[];
  selected?: boolean;
  children: ReactNode;
}

/**
 * Base node wrapper with glass-morphism styling and custom handles.
 * Handles support click-to-connect for opening the context menu.
 */
export function BaseNode({
  borderColor,
  headerBg,
  headerText,
  handles = [],
  selected,
  children,
}: BaseNodeProps) {
  return (
    <div
      className="wf-node"
      style={{
        borderColor: selected ? borderColor : `${borderColor}88`,
        boxShadow: selected ? `0 0 20px ${borderColor}22` : undefined,
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <div
        className="wf-node-header drag-handle"
        style={{ background: headerBg, cursor: "grab" }}
      >
        {headerText}
      </div>
      {handles.map((h) => (
        <CustomHandle key={`${h.type}-${h.id}`} {...h} />
      ))}
      <div className="wf-node-body">{children}</div>
    </div>
  );
}
