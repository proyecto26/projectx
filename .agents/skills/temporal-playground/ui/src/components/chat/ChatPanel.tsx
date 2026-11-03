import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { ConnectionStatus } from "./ConnectionStatus";

export function ChatPanel() {
  return (
    <aside
      className="chat-panel flex w-[350px] min-w-[350px] flex-col border-border border-l bg-bg2"
      aria-label="Chat with Claude"
    >
      <div className="border-border border-b px-4 py-3">
        <h2 className="text-[13px] text-text-bright">Chat with Claude</h2>
        <div className="mt-0.5 text-[11px] text-text-dim">
          Send workflow specs for implementation
        </div>
        <ConnectionStatus />
      </div>
      <ChatMessages />
      <ChatInput />
    </aside>
  );
}
