import type { ChatMessage as ChatMessageType } from "../../types";

export function ChatMessage({ message }: { message: ChatMessageType }) {
  return (
    <div className={`msg ${message.type}`}>
      {message.type === "user" && <div className="msg-label">You</div>}
      {message.type === "claude" && <div className="msg-label">Claude</div>}
      {message.text}
    </div>
  );
}
