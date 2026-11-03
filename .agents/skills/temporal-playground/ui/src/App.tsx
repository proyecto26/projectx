import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./components/canvas/Canvas";
import { ChatPanel } from "./components/chat/ChatPanel";
import { Toolbar } from "./components/layout/Toolbar";
import { Palette } from "./components/palette/Palette";
import { SpecPanel } from "./components/spec/SpecPanel";
import { useHashRouting } from "./hooks/useHashRouting";
import { useSSE } from "./hooks/useSSE";
import { useWorkflowScanner } from "./hooks/useWorkflowScanner";

function AppInner() {
  useSSE();
  const { workflows } = useWorkflowScanner();
  useHashRouting(workflows);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-text">
      {/* Top 3-column layout */}
      <div className="top-area flex min-h-0 flex-1">
        {/* Left Palette */}
        <Palette />

        {/* Center Canvas */}
        <main
          className="relative flex min-w-0 flex-1 flex-col"
          aria-label="Workflow canvas"
        >
          <Toolbar />
          <Canvas />
        </main>

        {/* Right Chat Panel */}
        <ChatPanel />
      </div>

      {/* Bottom Spec Output */}
      <SpecPanel />
    </div>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
