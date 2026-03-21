import { useState } from "react";
import { useChat } from "../../hooks/useChat";

export function ChatInput() {
  const [text, setText] = useState("");
  const { sendChat, applyChanges } = useChat();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendChat(text);
      setText("");
    }
  };

  return (
    <div className="flex flex-col gap-2 border-border border-t px-4 py-3">
      <textarea
        className="h-[60px] w-full resize-none rounded-lg border border-border bg-bg px-2.5 py-2 font-sans text-text text-xs placeholder:text-text-dim focus:border-blue focus:outline-none"
        placeholder="Ask Claude about your workflow design..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex gap-1.5">
        <button
          type="button"
          className="chat-btn btn-send"
          onClick={() => {
            sendChat(text);
            setText("");
          }}
        >
          Send
        </button>
        <button
          type="button"
          className="chat-btn btn-apply"
          onClick={() => {
            applyChanges(text);
            setText("");
          }}
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}
