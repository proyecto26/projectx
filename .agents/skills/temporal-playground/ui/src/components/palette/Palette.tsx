import { ExistingWorkflows } from "./ExistingWorkflows";
import { Legend } from "./Legend";
import { NewWorkflowButton } from "./NewWorkflowButton";
import { NodeTypeList } from "./NodeTypeList";
import { PresetList } from "./PresetList";

export function Palette() {
  return (
    <nav
      className="palette flex w-[250px] min-w-[250px] flex-col overflow-y-auto overflow-x-hidden border-border border-r bg-bg2"
      aria-label="Workflow palette"
    >
      <h1 className="px-4 pt-4 pb-1 text-sm text-text-bright tracking-wide">
        Workflow Builder
      </h1>
      <p className="px-4 pb-3 text-[11px] text-text-dim">
        Drag nodes to design Temporal workflows
      </p>
      <NewWorkflowButton />
      <ExistingWorkflows />
      <NodeTypeList />
      <PresetList />
      <Legend />
    </nav>
  );
}
