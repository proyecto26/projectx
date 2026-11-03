import type { Edge, Node } from "@xyflow/react";
import { useCallback, useRef } from "react";
import { useWorkflowStore } from "../store/workflow-store";

interface Snapshot {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Snapshot-based undo/redo system.
 * Stores up to 50 snapshots with 50ms debounce.
 * Inspired by HeroUI Studio's undo/redo implementation.
 */
export function useUndoRedo() {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lastSnapshotTime = useRef(0);

  const takeSnapshot = useCallback(() => {
    const now = Date.now();
    if (now - lastSnapshotTime.current < 50) return;
    lastSnapshotTime.current = now;

    const { nodes, edges } = useWorkflowStore.getState();
    undoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;

    const { nodes, edges } = useWorkflowStore.getState();
    redoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });

    useWorkflowStore.getState().setNodes(snapshot.nodes);
    useWorkflowStore.getState().setEdges(snapshot.edges);
  }, []);

  const redo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;

    const { nodes, edges } = useWorkflowStore.getState();
    undoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });

    useWorkflowStore.getState().setNodes(snapshot.nodes);
    useWorkflowStore.getState().setEdges(snapshot.edges);
  }, []);

  return { takeSnapshot, undo, redo };
}
