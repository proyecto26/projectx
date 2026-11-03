import { useCallback, useEffect, useMemo, useRef } from "react";
import { type FieldDef, getNodeConfig } from "../../constants";
import { useWorkflowStore } from "../../store/workflow-store";
import type { WorkflowNodeType } from "../../types";
import type { WorkflowParam } from "../../types/nodes";
import { CodeMirrorField } from "../editor/CodeMirrorField";
import { ActivityPicker } from "./ActivityPicker";
import { ParamsEditor } from "./ParamsEditor";

export function NodeDetailPanel() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const setSelectedNodeId = useWorkflowStore((s) => s.setSelectedNodeId);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const nodeConfig = selectedNode
    ? getNodeConfig(selectedNode.type as WorkflowNodeType)
    : null;

  const handleClose = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedNodeId) handleClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedNodeId, handleClose]);

  if (!selectedNode || !nodeConfig) return null;

  const isStart = selectedNode.type === "start";

  return (
    <div
      className={`absolute top-0 right-0 bottom-0 z-20 flex flex-col border-white/[0.08] border-l bg-[#1a1a1a]/95 backdrop-blur-md ${
        isStart ? "w-[520px]" : "w-[320px]"
      }`}
      style={{ animation: "slideInRight 0.15s ease-out" }}
    >
      {isStart ? (
        <StartNodePanel
          node={selectedNode}
          nodeConfig={nodeConfig}
          updateNodeData={updateNodeData}
          onClose={handleClose}
        />
      ) : (
        <GenericNodePanel
          node={selectedNode}
          nodeConfig={nodeConfig}
          updateNodeData={updateNodeData}
          onClose={handleClose}
        />
      )}
    </div>
  );
}

/* ── START NODE — custom two-panel layout ────────────────────────── */

function StartNodePanel({
  node,
  nodeConfig,
  updateNodeData,
  onClose,
}: {
  node: { id: string; data: Record<string, unknown> };
  nodeConfig: {
    icon: string;
    color: string;
    dot: string;
    label: string;
    desc: string;
  };
  updateNodeData: (id: string, key: string, value: unknown) => void;
  onClose: () => void;
}) {
  const paramsEditorRef = useRef<{ triggerAdd: () => void }>(null);
  const params: WorkflowParam[] = Array.isArray(node.data.params)
    ? (node.data.params as WorkflowParam[])
    : [];

  return (
    <>
      {/* Header with + icon */}
      <div className="flex items-center gap-2 border-white/[0.08] border-b px-4 py-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{
            backgroundColor: `${nodeConfig.color}33`,
            color: nodeConfig.dot,
          }}
        >
          {nodeConfig.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-sm text-white">
            {nodeConfig.label}
          </h3>
        </div>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-md text-lg text-white/40 leading-none transition-colors hover:bg-blue-500/10 hover:text-blue-400"
          onClick={() => paramsEditorRef.current?.triggerAdd()}
          title="Add parameter"
        >
          +
        </button>
        <button
          type="button"
          className="ml-1 text-lg text-white/30 leading-none transition-colors hover:text-white"
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Two-panel body */}
      <ParamsEditor
        ref={paramsEditorRef}
        params={params}
        onChange={(newParams) => updateNodeData(node.id, "params", newParams)}
      />

      {/* Footer */}
      <div className="truncate border-white/[0.08] border-t px-4 py-2 font-mono text-[10px] text-white/20">
        {node.id}
      </div>
    </>
  );
}

/* ── GENERIC NODE — default field list layout ────────────────────── */

function GenericNodePanel({
  node,
  nodeConfig,
  updateNodeData,
  onClose,
}: {
  node: { id: string; type?: string; data: Record<string, unknown> };
  nodeConfig: {
    icon: string;
    color: string;
    dot: string;
    label: string;
    desc: string;
    fields: FieldDef[];
  };
  updateNodeData: (id: string, key: string, value: unknown) => void;
  onClose: () => void;
}) {
  const fields = nodeConfig.fields ?? [];

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 border-white/[0.08] border-b px-4 py-3">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{
            backgroundColor: `${nodeConfig.color}33`,
            color: nodeConfig.dot,
          }}
        >
          {nodeConfig.icon}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-sm text-white">
            {nodeConfig.label}
          </h3>
          <p className="text-[10px] text-white/40">{nodeConfig.desc}</p>
        </div>
        <button
          type="button"
          className="text-lg text-white/30 leading-none transition-colors hover:text-white"
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {/* Activity picker for activity nodes */}
        {node.type === "activity" && (
          <ActivityPicker
            onSelect={(act) => {
              updateNodeData(node.id, "activityName", act.name);
              if (act.config?.timeout)
                updateNodeData(node.id, "timeout", act.config.timeout);
              if (act.config?.maxAttempts)
                updateNodeData(node.id, "maxAttempts", act.config.maxAttempts);
            }}
          />
        )}
        {fields.length === 0 && (
          <p className="text-white/30 text-xs italic">
            No configurable fields.
          </p>
        )}
        {fields.map((field) => (
          <DetailField
            key={field.key}
            field={field}
            value={node.data[field.key]}
            onChange={(val) => updateNodeData(node.id, field.key, val)}
          />
        ))}
      </div>

      {/* Footer with node ID */}
      <div className="truncate border-white/[0.08] border-t px-4 py-2 font-mono text-[10px] text-white/20">
        {node.id}
      </div>
    </>
  );
}

/* ── DETAIL FIELD — renders individual field types ────────────────── */

function DetailField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (field.type === "params-editor") {
    const paramsList: WorkflowParam[] = Array.isArray(value) ? value : [];
    return (
      <ParamsEditor
        params={paramsList}
        onChange={(newParams) => onChange(newParams)}
      />
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-blue-500"
        />
        <span className="text-white/70 text-xs">{field.label}</span>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-white/40 uppercase tracking-wider">
          {field.label}
        </span>
        <select
          value={(value as string) ?? field.options?.[0]?.value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-[11px] text-white/80 focus:border-blue-500/50 focus:outline-none"
        >
          {field.options?.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-[#1a1a1a] text-white"
            >
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "code") {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-white/40 uppercase tracking-wider">
          {field.label}
        </span>
        <CodeMirrorField
          value={(value as string) ?? ""}
          onChange={(val) => onChange(val)}
          placeholder={field.placeholder}
          minHeight="100px"
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-white/40 uppercase tracking-wider">
          {field.label}
        </span>
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full resize-y rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-2 font-sans text-[11px] text-white/80 focus:border-blue-500/50 focus:outline-none"
          style={{ minHeight: "60px" }}
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-[10px] text-white/40 uppercase tracking-wider">
          {field.label}
        </span>
        <input
          type="number"
          value={(value as number) ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 font-mono text-[11px] text-white/80 focus:border-blue-500/50 focus:outline-none"
          min={0}
          max={100}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium text-[10px] text-white/40 uppercase tracking-wider">
        {field.label}
      </span>
      <input
        type="text"
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/80 focus:border-blue-500/50 focus:outline-none"
      />
    </div>
  );
}
