interface NodeFieldProps {
  label: string;
  value: unknown;
  onChange: (value: unknown) => void;
  type?: "text" | "number" | "toggle";
}

export function NodeField({
  label,
  value,
  onChange,
  type = "text",
}: NodeFieldProps) {
  if (type === "toggle") {
    return (
      <div className="wf-field">
        <label className="wf-field-toggle">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="nodrag nopan cursor-pointer"
          />
          <span className="wf-field-label">{label}</span>
        </label>
      </div>
    );
  }

  if (type === "number") {
    return (
      <div className="wf-field">
        <span className="wf-field-label">{label}</span>
        <input
          type="number"
          value={(value as number) ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="nodrag nopan wf-field-input"
          min={1}
          max={100}
        />
      </div>
    );
  }

  return (
    <div className="wf-field">
      <span className="wf-field-label">{label}</span>
      <input
        type="text"
        value={(value as string) || ""}
        onChange={(e) => onChange(e.target.value)}
        className="nodrag nopan wf-field-input"
      />
    </div>
  );
}
