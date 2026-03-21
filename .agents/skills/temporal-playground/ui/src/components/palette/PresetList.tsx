import { PRESETS } from "../../constants/presets";
import { useWorkflowStore } from "../../store/workflow-store";

export function PresetList() {
  const { activeSource, loadGraph } = useWorkflowStore();

  return (
    <div className="section border-border border-b px-4 py-3">
      <div className="section-title">Templates</div>
      <div className="presets">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            className={`preset-btn${activeSource?.key === key ? "active" : ""}`}
            onClick={() => {
              const { nodes, edges } = preset.build();
              loadGraph(nodes, edges, { type: "preset", key });
            }}
          >
            <div>{preset.label}</div>
            <div className="preset-desc">{preset.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
