export function Legend() {
  return (
    <div className="section border-border border-b px-4 py-3">
      <div className="section-title">Legend</div>
      <div className="text-[11px] text-text-dim leading-[1.8]">
        <div>
          <span className="text-blue">{"\u25A0"}</span> Flow connections &mdash;
          execution order
        </div>
        <div>
          <span className="text-teal">{"\u25A0"}</span> Data connections &mdash;
          state/results
        </div>
        <div>
          <span className="text-orange">{"\u25A0"}</span> Workflow connections
          &mdash; signal/query/update
        </div>
      </div>
    </div>
  );
}
