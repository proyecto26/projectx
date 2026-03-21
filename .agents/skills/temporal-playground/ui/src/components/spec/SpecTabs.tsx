import { useUIStore } from "../../store/ui-store";

export function SpecTabs() {
  const { specTab, setSpecTab } = useUIStore();

  return (
    <div className="flex gap-1">
      <button
        type="button"
        className={`spec-tab${specTab === "nl" ? "active" : ""}`}
        onClick={() => setSpecTab("nl")}
      >
        Natural Language
      </button>
      <button
        type="button"
        className={`spec-tab${specTab === "json" ? "active" : ""}`}
        onClick={() => setSpecTab("json")}
      >
        JSON
      </button>
    </div>
  );
}
