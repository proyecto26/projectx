import type { NodeTypes } from "@xyflow/react";
import { NODE_REGISTRY } from "../constants";
import { CompactNode } from "./CompactNode";

/** Auto-generated from NODE_REGISTRY — all types render as CompactNode */
export const nodeTypes: NodeTypes = Object.fromEntries(
  NODE_REGISTRY.map((entry) => [entry.type, CompactNode]),
);
