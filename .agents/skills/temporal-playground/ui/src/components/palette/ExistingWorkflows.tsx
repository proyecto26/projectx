import { useWorkflowScanner } from "../../hooks/useWorkflowScanner";
import { workflowToGraph } from "../../lib/workflow-parser";
import { useUIStore } from "../../store/ui-store";
import { useWorkflowStore } from "../../store/workflow-store";
import type { WorkflowMetadata } from "../../types";

const PROJECT_LABELS: Record<string, string> = {
  order: "Order Service",
  auth: "Auth Service",
  product: "Product Service",
};
const PROJECT_INITIALS: Record<string, string> = {
  order: "O",
  auth: "A",
  product: "P",
};

function WorkflowItem({ wf }: { wf: WorkflowMetadata }) {
  const { activeSource, loadGraph } = useWorkflowStore();

  const handleClick = () => {
    const { nodes, edges } = workflowToGraph(wf);
    loadGraph(nodes, edges, {
      type: "existing",
      key: wf.name,
      path: wf.filePath,
      service: wf.service,
    });
  };

  return (
    <button
      type="button"
      className={`existing-wf-item${activeSource?.key === wf.name ? "active" : ""}`}
      onClick={handleClick}
    >
      <div className="existing-wf-name">{wf.name}</div>
      <div className="existing-wf-path" title={wf.filePath}>
        {wf.filePath}
      </div>
      <div className="existing-wf-meta">
        {wf.signals.length > 0 && (
          <span title="Signals">
            {"\u26A1"}
            {wf.signals.length}
          </span>
        )}
        {wf.queries.length > 0 && (
          <span title="Queries">
            {"\uD83D\uDD0D"}
            {wf.queries.length}
          </span>
        )}
        {wf.updates.length > 0 && (
          <span title="Updates">
            {"\u270F\uFE0F"}
            {wf.updates.length}
          </span>
        )}
        {wf.childWorkflows.length > 0 && (
          <span title="Child Workflows">
            {"\uD83D\uDD17"}
            {wf.childWorkflows.length}
          </span>
        )}
      </div>
    </button>
  );
}

function WorkflowProjectGroup({
  service,
  workflows,
}: {
  service: string;
  workflows: WorkflowMetadata[];
}) {
  const { collapsedGroups, toggleGroup } = useUIStore();
  const collapsed = collapsedGroups[service] ?? false;

  return (
    <div className="wf-project-group">
      <button
        type="button"
        className="wf-project-header"
        onClick={() => toggleGroup(service)}
        aria-expanded={!collapsed}
      >
        <span className={`wf-project-chevron${collapsed ? "collapsed" : ""}`}>
          {"\u25BC"}
        </span>
        <span className={`wf-project-icon ${service}`}>
          {PROJECT_INITIALS[service] ?? service[0]?.toUpperCase()}
        </span>
        <span className="wf-project-name">
          {PROJECT_LABELS[service] ?? service}
        </span>
        <span className="wf-project-count">{workflows.length}</span>
      </button>
      <div className={`wf-project-items${collapsed ? "collapsed" : ""}`}>
        {workflows.map((wf) => (
          <WorkflowItem key={wf.name} wf={wf} />
        ))}
      </div>
    </div>
  );
}

export function ExistingWorkflows() {
  const { groups, loading } = useWorkflowScanner();

  if (loading) {
    return (
      <div className="section border-border border-b px-4 py-3">
        <div className="section-title">Existing Workflows</div>
        <div className="text-[10px] text-text-dim">Scanning...</div>
      </div>
    );
  }

  const services = Object.keys(groups);
  if (services.length === 0) {
    return (
      <div className="section border-border border-b px-4 py-3">
        <div className="section-title">Existing Workflows</div>
        <div className="text-[10px] text-text-dim">No workflows found</div>
      </div>
    );
  }

  return (
    <div className="section border-border border-b px-4 py-3">
      <div className="section-title">Existing Workflows</div>
      <div className="existing-wf">
        {services.map((svc) => (
          <WorkflowProjectGroup
            key={svc}
            service={svc}
            workflows={groups[svc] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
