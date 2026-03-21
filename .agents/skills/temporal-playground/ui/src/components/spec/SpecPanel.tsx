import { useSpec } from "../../hooks/useSpec";
import { SpecTabs } from "./SpecTabs";

export function SpecPanel() {
  const specContent = useSpec();

  return (
    <div className="flex max-h-[200px] flex-col border-border border-t bg-bg2">
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <span className="font-semibold text-[11px] text-text-dim uppercase tracking-widest">
          Spec Output
        </span>
        <div className="flex items-center gap-3">
          <SpecTabs />
          <div className="spec-buttons flex gap-1.5">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(specContent)}
            >
              Copy
            </button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
        <pre className="m-0 whitespace-pre-wrap font-mono text-[11px] text-text leading-relaxed">
          {specContent}
        </pre>
      </div>
    </div>
  );
}
