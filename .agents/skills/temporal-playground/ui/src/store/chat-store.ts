import { create } from "zustand";
import type { ChatMessage } from "../types";

export interface ChatStore {
  messages: ChatMessage[];
  serverConnected: boolean;
  addMessage: (type: ChatMessage["type"], text: string) => void;
  setServerConnected: (connected: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [
    {
      type: "system",
      text: "Use Send to discuss your workflow design. Use Apply Changes to generate a spec and request code changes.",
    },
  ],
  serverConnected: false,

  addMessage: (type, text) => {
    set((s) => ({ messages: [...s.messages, { type, text }] }));
  },

  setServerConnected: (connected) => set({ serverConnected: connected }),
}));
