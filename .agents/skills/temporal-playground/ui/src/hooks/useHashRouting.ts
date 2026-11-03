import { useEffect, useRef } from "react";
import { PRESETS } from "../constants/presets";
import { workflowToGraph } from "../lib/workflow-parser";
import { useWorkflowStore } from "../store/workflow-store";
import type { WorkflowMetadata } from "../types";

/**
 * Syncs the active workflow/preset to the URL hash for deep linking.
 *
 * - Loading an existing workflow sets  #workflow=<name>
 * - Loading a preset sets              #preset=<key>
 * - Clearing / new workflow clears the hash
 * - On mount, reads the hash and auto-loads the matching workflow/preset
 *
 * Must be called inside a component that also has access to scanned workflows
 * (passed via `scannedWorkflows`).
 */
export function useHashRouting(scannedWorkflows: WorkflowMetadata[]) {
  const activeSource = useWorkflowStore((s) => s.activeSource);
  const loadGraph = useWorkflowStore((s) => s.loadGraph);
  const initialLoadDone = useRef(false);

  // 1. On mount (and when scanned workflows arrive), restore from hash
  useEffect(() => {
    if (initialLoadDone.current) return;

    const hash = window.location.hash.slice(1); // remove leading #
    if (!hash) {
      initialLoadDone.current = true;
      return;
    }

    const params = new URLSearchParams(hash);

    // Try preset first (always available without scanning)
    const presetKey = params.get("preset");
    if (presetKey && PRESETS[presetKey]) {
      const { nodes, edges } = PRESETS[presetKey].build();
      loadGraph(nodes, edges, { type: "preset", key: presetKey });
      initialLoadDone.current = true;
      return;
    }

    // Try existing workflow (needs scan results)
    const workflowName = params.get("workflow");
    if (workflowName && scannedWorkflows.length > 0) {
      const wf = scannedWorkflows.find((w) => w.name === workflowName);
      if (wf) {
        const { nodes, edges } = workflowToGraph(wf);
        loadGraph(nodes, edges, {
          type: "existing",
          key: wf.name,
          path: wf.filePath,
          service: wf.service,
        });
      }
      initialLoadDone.current = true;
      return;
    }

    // If we have a workflow hash but scans aren't in yet, don't mark as done
    // so we retry when scannedWorkflows updates
    if (workflowName && scannedWorkflows.length === 0) return;

    initialLoadDone.current = true;
  }, [scannedWorkflows, loadGraph]);

  // 2. Whenever activeSource changes, update the hash
  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (!activeSource) {
      // Clear hash without triggering a page jump
      if (window.location.hash) {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
      return;
    }

    let newHash = "";
    if (activeSource.type === "existing") {
      newHash = `#workflow=${encodeURIComponent(activeSource.key)}`;
    } else if (activeSource.type === "preset") {
      newHash = `#preset=${encodeURIComponent(activeSource.key)}`;
    }

    if (newHash && window.location.hash !== newHash) {
      history.replaceState(null, "", newHash);
    }
  }, [activeSource]);
}
