import { useWorkflowStore } from "../../store/workflow-store";

export function NewWorkflowButton() {
  const newWorkflow = useWorkflowStore((s) => s.newWorkflow);
  return (
    <div className="section border-border border-b px-4 py-3">
      <button type="button" className="new-wf-btn" onClick={newWorkflow}>
        + New Workflow
      </button>
    </div>
  );
}
