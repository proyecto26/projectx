import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { create } from "zustand";
import { getNodeDefaults } from "../constants";
import type { ActiveSource, WorkflowNodeType } from "../types";

export interface WorkflowStore {
  nodes: Node[];
  edges: Edge[];
  activeSource: ActiveSource | null;
  selectedNodeId: string | null;

  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  updateNodeData: (id: string, key: string, value: unknown) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;

  loadGraph: (
    nodes: Node[],
    edges: Edge[],
    source: ActiveSource | null,
  ) => void;
  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void;
  clearCanvas: () => void;
  setSelectedNodeId: (id: string | null) => void;

  newWorkflow: () => void;
  autoArrange: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  activeSource: null,
  selectedNodeId: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (params) => {
    let type = "flow";
    if (params.sourceHandle?.includes("data")) type = "data";
    if (params.targetHandle?.includes("wf")) type = "workflow";
    if (
      params.sourceHandle?.includes("prompt") ||
      params.targetHandle?.includes("prompt")
    )
      type = "data";
    if (
      params.sourceHandle?.includes("gen") ||
      params.targetHandle?.includes("gen")
    )
      type = "data";
    set({ edges: addEdge({ ...params, type }, get().edges) });
  },

  updateNodeData: (id, key, value) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, [key]: value } } : n,
      ),
    });
  },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  loadGraph: (nodes, edges, source) => {
    set({ nodes, edges, activeSource: source, selectedNodeId: null });
  },

  addNode: (type, position) => {
    const defaults = getNodeDefaults(type);
    if (!defaults) return;
    const node: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { ...defaults },
    };
    set({ nodes: [...get().nodes, node] });
  },

  clearCanvas: () => {
    set({ nodes: [], edges: [], activeSource: null, selectedNodeId: null });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  newWorkflow: () => {
    set({
      nodes: [
        {
          id: "new-start",
          type: "start",
          position: { x: 50, y: 100 },
          data: { ...getNodeDefaults("start") },
        },
        {
          id: "new-end",
          type: "end",
          position: { x: 700, y: 100 },
          data: { ...getNodeDefaults("end") },
        },
      ],
      edges: [
        {
          id: "new-e1",
          source: "new-start",
          sourceHandle: "flow-out",
          target: "new-end",
          targetHandle: "flow-in",
          type: "flow",
        },
      ],
      activeSource: null,
      selectedNodeId: null,
    });
  },

  autoArrange: () => {
    const { nodes } = get();
    if (nodes.length === 0) return;
    const priority: Record<string, number> = {
      start: 0,
      activity: 1,
      signal: 2,
      query: 3,
      update: 4,
      childWorkflow: 5,
      condition: 6,
      sleep: 7,
      loop: 8,
      customCode: 9,
      variableChange: 10,
      apiCall: 11,
      end: 12,
      textPrompt: 13,
      aiGeneration: 14,
    };
    const sorted = [...nodes].sort(
      (a, b) => (priority[a.type ?? ""] ?? 5) - (priority[b.type ?? ""] ?? 5),
    );
    let x = 50;
    let y = 50;
    let col = 0;
    set({
      nodes: sorted.map((n) => {
        const pos = { x, y };
        col++;
        if (col >= 3) {
          col = 0;
          x = 50;
          y += 250;
        } else {
          x += 320;
        }
        return { ...n, position: pos };
      }),
    });
  },
}));
