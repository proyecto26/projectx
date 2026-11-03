import { useChatStore } from "../../store/chat-store";

export function ConnectionStatus() {
  const serverConnected = useChatStore((s) => s.serverConnected);
  return (
    <div className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-text-dim">
      <span
        className={`status-dot ${serverConnected ? "connected" : "disconnected"}`}
      />
      <span>
        {serverConnected
          ? "Connected to temporal-playground"
          : "Not connected (start on :4343)"}
      </span>
    </div>
  );
}
