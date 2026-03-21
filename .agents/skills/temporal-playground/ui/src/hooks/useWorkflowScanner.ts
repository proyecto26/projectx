import { useEffect, useState } from "react";
import { fetchWorkflows } from "../lib/api";
import type { WorkflowMetadata } from "../types";

export function useWorkflowScanner() {
  const [workflows, setWorkflows] = useState<WorkflowMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkflows()
      .then(setWorkflows)
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by service
  const groups: Record<string, WorkflowMetadata[]> = {};
  for (const wf of workflows) {
    if (!groups[wf.service]) groups[wf.service] = [];
    groups[wf.service]?.push(wf);
  }

  return { workflows, groups, loading };
}
