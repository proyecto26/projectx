export type MessageType = "system" | "user" | "claude";

export interface ChatMessage {
  type: MessageType;
  text: string;
}
