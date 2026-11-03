import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";

/**
 * Flow Edge — "noodle" style bezier connector for execution flow.
 * Blue color with animated particle on selection.
 */
export function FlowEdge({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  markerEnd,
  id,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: sourceX - 20,
    sourceY,
    targetX: targetX + 20,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={`${id}-hit`}
        path={edgePath}
        style={{ stroke: "transparent", strokeWidth: 12, fill: "none" }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected
            ? "rgba(122, 162, 247, 0.8)"
            : "rgba(122, 162, 247, 0.5)",
          strokeWidth: selected ? 2.5 : 2,
          fill: "none",
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
        }}
      />
      {selected && (
        <circle r={3.5} fill="rgba(122, 162, 247, 0.9)">
          <animateMotion dur="2s" path={edgePath} repeatCount="indefinite" />
        </circle>
      )}
    </>
  );
}
