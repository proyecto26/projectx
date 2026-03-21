import { useMemo } from "react";
import { generateJSON, generateNL } from "../lib/spec-generator";
import { useUIStore } from "../store/ui-store";
import { useWorkflowStore } from "../store/workflow-store";

export function useSpec() {
  const { nodes, activeSource } = useWorkflowStore();
  const specTab = useUIStore((s) => s.specTab);

  const specContent = useMemo(() => {
    if (nodes.length === 0)
      return "Load a preset or build a workflow to see the generated spec.";
    try {
      return specTab === "json"
        ? JSON.stringify(generateJSON(nodes, activeSource), null, 2)
        : generateNL(nodes, activeSource);
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }, [nodes, activeSource, specTab]);

  return specContent;
}
