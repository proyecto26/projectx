import {
  Handle,
  type HandleProps,
  useNodeId,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useRef } from "react";

interface CustomHandleProps extends HandleProps {
  connectionCount?: number;
}

/**
 * Custom Handle with click-to-connect support.
 * When clicked (without dragging), dispatches a "handle-click" CustomEvent
 * that opens the context menu filtered by connection rules.
 * Inspired by HeroUI Studio's handle implementation.
 */
export function CustomHandle({ connectionCount, ...props }: CustomHandleProps) {
  const nodeId = useNodeId();
  const { getNode } = useReactFlow();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || !nodeId) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;

      const node = getNode(nodeId);
      if (!node?.type) return;

      document.dispatchEvent(
        new CustomEvent("handle-click", {
          detail: {
            nodeId,
            nodeType: node.type,
            handleType: props.type,
            clientX: e.clientX,
            clientY: e.clientY,
          },
        }),
      );
    },
    [nodeId, getNode, props.type],
  );

  return (
    <Handle
      {...props}
      isConnectable={true}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    />
  );
}
