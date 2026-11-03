import { BaseEdge, type EdgeProps, getBezierPath } from "@xyflow/react";

/**
 * Data Edge — "noodle" style bezier connector for data/state flow.
 * Teal dashed line with animated particle on selection.
 */
export function DataEdge({
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
            ? "rgba(42, 195, 222, 0.7)"
            : "rgba(42, 195, 222, 0.4)",
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: "6 3",
          fill: "none",
          transition: "stroke 0.15s ease, stroke-width 0.15s ease",
        }}
      />
      {selected && (
        <circle r={3.5} fill="rgba(42, 195, 222, 0.9)">
          <animateMotion dur="2s" path={edgePath} repeatCount="indefinite" />
        </circle>
      )}
    </>
  );
}
