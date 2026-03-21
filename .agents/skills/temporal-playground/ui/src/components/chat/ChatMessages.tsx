import { useEffect, useRef } from "react";
import { useChatStore } from "../../store/chat-store";
import { ChatMessage } from "./ChatMessage";

export function ChatMessages() {
  const messages = useChatStore((s) => s.messages);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  });

  return (
    <div
      ref={ref}
      className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3"
      role="log"
      aria-label="Chat messages"
    >
      {messages.map((m, i) => (
        <ChatMessage key={`${m.role}-${i}`} message={m} />
      ))}
    </div>
  );
}
