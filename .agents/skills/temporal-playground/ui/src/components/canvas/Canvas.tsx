import {
  addEdge,
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  MiniMap,
  type OnConnectEnd,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CONNECTION_RULES, getNodeConfig } from "../../constants";
import { edgeTypes } from "../../edges";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";
import { useKeyboardShortcut } from "../../hooks/useKeyboardShortcuts";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { nodeTypes } from "../../nodes";
import { useWorkflowStore } from "../../store/workflow-store";
import type { WorkflowNodeType } from "../../types";
import { ContextMenu } from "./ContextMenu";
import { NodeDetailPanel } from "./NodeDetailPanel";
import { VerticalToolbar } from "./VerticalToolbar";

interface ContextMenuState {
  x: number;
  y: number;
  flowX: number;
  flowY: number;
  connectFrom?: {
    nodeId: string;
    nodeType: string;
    handleType: string;
  };
}

/**
 * Enhanced Canvas with:
 * - Connection validation rules
 * - Context menu on connection drop / double-click / right-click
 * - Undo/redo support
 * - Keyboard shortcuts
 * - Vertical toolbar for quick node adding
 * Inspired by HeroUI Studio's canvas implementation.
 */
export function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    setSelectedNodeId,
  } = useWorkflowStore();
  const { onDragOver, onDrop } = useDragAndDrop();
  const { screenToFlowPosition } = useReactFlow();
  const { takeSnapshot, undo, redo } = useUndoRedo();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const memoNodeTypes = useMemo(() => nodeTypes, []);
  const memoEdgeTypes = useMemo(() => edgeTypes, []);

  // Connection validation using CONNECTION_RULES
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const { source, target } = connection;
      if (!source || !target || source === target) return false;

      const sourceNode = nodes.find((n) => n.id === source);
      const targetNode = nodes.find((n) => n.id === target);
      if (!sourceNode || !targetNode) return false;

      const sourceType = sourceNode.type as WorkflowNodeType;
      const targetType = targetNode.type as WorkflowNodeType;

      // Allow data, workflow, prompt, and generation handle connections freely
      if (
        connection.sourceHandle?.includes("data") ||
        connection.targetHandle?.includes("wf") ||
        connection.sourceHandle?.includes("prompt") ||
        connection.targetHandle?.includes("prompt") ||
        connection.sourceHandle?.includes("gen") ||
        connection.targetHandle?.includes("gen")
      ) {
        return true;
      }

      const allowed = CONNECTION_RULES[sourceType];
      return allowed?.includes(targetType) ?? false;
    },
    [nodes],
  );

  // Wrap onConnect with snapshot for undo
  const handleConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params)) {
        takeSnapshot();
        onConnect(params);
      }
    },
    [onConnect, isValidConnection, takeSnapshot],
  );

  // Wrap node/edge changes with snapshot on remove
  const handleNodesChange = useCallback(
    (...args: Parameters<typeof onNodesChange>) => {
      if (args[0].some((c) => c.type === "remove")) takeSnapshot();
      onNodesChange(...args);
    },
    [onNodesChange, takeSnapshot],
  );

  const handleEdgesChange = useCallback(
    (...args: Parameters<typeof onEdgesChange>) => {
      if (args[0].some((c) => c.type === "remove")) takeSnapshot();
      onEdgesChange(...args);
    },
    [onEdgesChange, takeSnapshot],
  );

  // Connection start/end for context menu
  const handleConnectStart = useCallback(() => {
    setIsConnecting(true);
  }, []);

  const handleConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      setIsConnecting(false);
      if (connectionState?.isValid) return;

      const fromNodeId = connectionState?.fromNode?.id;
      const fromNodeType = connectionState?.fromNode?.type;
      const fromHandleType = connectionState?.fromHandle?.type;

      if (!fromNodeId || !fromNodeType || !fromHandleType) return;

      const clientX =
        "clientX" in event
          ? event.clientX
          : ((event as TouchEvent).changedTouches?.[0]?.clientX ?? 0);
      const clientY =
        "clientY" in event
          ? event.clientY
          : ((event as TouchEvent).changedTouches?.[0]?.clientY ?? 0);

      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

      setContextMenu({
        x: clientX,
        y: clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
        connectFrom: {
          nodeId: fromNodeId,
          nodeType: fromNodeType,
          handleType: fromHandleType,
        },
      });
    },
    [screenToFlowPosition],
  );

  // Double-click and right-click on canvas open context menu
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).classList.contains("react-flow__pane"))
        return;
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (!(e.target as HTMLElement).classList.contains("react-flow__pane"))
        return;
      e.preventDefault();
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId],
  );

  // Context menu selection: add node and optionally auto-connect
  const handleContextMenuSelect = useCallback(
    (type: WorkflowNodeType) => {
      if (!contextMenu) return;
      takeSnapshot();

      const nodeId = `${type}-${Date.now()}`;
      addNode(type, { x: contextMenu.flowX, y: contextMenu.flowY });

      if (contextMenu.connectFrom) {
        const {
          handleType,
          nodeId: fromNodeId,
          nodeType: fromNodeType,
        } = contextMenu.connectFrom;
        const aiTypes = ["textPrompt", "aiGeneration"];
        const edgeType =
          aiTypes.includes(fromNodeType) || aiTypes.includes(type)
            ? ("data" as const)
            : ("flow" as const);
        const edge =
          handleType === "source"
            ? {
                id: `${fromNodeId}->${nodeId}`,
                source: fromNodeId,
                target: nodeId,
                type: edgeType,
              }
            : {
                id: `${nodeId}->${fromNodeId}`,
                source: nodeId,
                target: fromNodeId,
                type: edgeType,
              };

        // Use a small delay to ensure node is in the store
        setTimeout(() => {
          useWorkflowStore
            .getState()
            .setEdges(addEdge(edge, useWorkflowStore.getState().edges));
        }, 0);
      }

      setContextMenu(null);
    },
    [contextMenu, addNode, takeSnapshot],
  );

  // Listen for handle-click events (from CustomHandle)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsConnecting(false);
      const flowPos = screenToFlowPosition({
        x: detail.clientX,
        y: detail.clientY,
      });
      setContextMenu({
        x: detail.clientX,
        y: detail.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
        connectFrom: {
          nodeId: detail.nodeId,
          nodeType: detail.nodeType,
          handleType: detail.handleType,
        },
      });
    };
    document.addEventListener("handle-click", handler);
    return () => document.removeEventListener("handle-click", handler);
  }, [screenToFlowPosition]);

  // Compute allowed types for context menu
  const allowedTypes = contextMenu?.connectFrom
    ? contextMenu.connectFrom.handleType === "source"
      ? CONNECTION_RULES[contextMenu.connectFrom.nodeType as WorkflowNodeType]
      : (
          Object.entries(CONNECTION_RULES) as [
            WorkflowNodeType,
            WorkflowNodeType[],
          ][]
        )
          .filter(([, targets]) =>
            targets.includes(
              contextMenu.connectFrom?.nodeType as WorkflowNodeType,
            ),
          )
          .map(([source]) => source)
    : undefined;

  // Keyboard shortcuts
  useKeyboardShortcut("z", undo, { ctrl: true });
  useKeyboardShortcut("z", redo, { ctrl: true, shift: true });

  return (
    <div
      role="application"
      className="relative flex-1"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={isValidConnection}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        onNodeDragStart={takeSnapshot}
        nodeTypes={memoNodeTypes}
        edgeTypes={memoEdgeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: "flow" }}
        deleteKeyCode={["Delete", "Backspace"]}
        proOptions={{ hideAttribution: true }}
        className={isConnecting ? "connecting" : ""}
      >
        <Background
          color="rgba(255, 255, 255, 0.15)"
          gap={24}
          size={1.2}
          variant={BackgroundVariant.Dots}
        />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          nodeColor={(n) => {
            const cfg = getNodeConfig(n.type as WorkflowNodeType);
            return cfg?.dot ?? "#555";
          }}
          maskColor="rgba(15, 17, 23, 0.7)"
        />
      </ReactFlow>
      <VerticalToolbar />
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          allowedTypes={allowedTypes}
          onSelect={handleContextMenuSelect}
          onClose={() => setContextMenu(null)}
        />
      )}
      <NodeDetailPanel />
    </div>
  );
}
