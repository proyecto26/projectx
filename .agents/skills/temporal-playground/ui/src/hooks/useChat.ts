import { useCallback } from "react";
import { postPrompt } from "../lib/api";
import { generateNL } from "../lib/spec-generator";
import { useChatStore } from "../store/chat-store";
import { useWorkflowStore } from "../store/workflow-store";

export function useChat() {
  const { addMessage, serverConnected } = useChatStore();
  const { nodes, activeSource } = useWorkflowStore();

  const sendChat = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      addMessage("user", text);
      if (!serverConnected) {
        addMessage(
          "system",
          "temporal-playground not running. Start the server on localhost:4343.",
        );
        return;
      }
      let context = text;
      if (activeSource) {
        const wfName = activeSource.key;
        context = `[Discussing workflow: ${wfName}] ${text}`;
      }
      const ok = await postPrompt(context, "chat");
      addMessage(
        "system",
        ok
          ? "Sent to Claude"
          : "Failed to send. Is temporal-playground running?",
      );
    },
    [serverConnected, activeSource, addMessage],
  );

  const applyChanges = useCallback(
    async (userNote: string) => {
      if (nodes.length === 0) {
        addMessage("system", "Add some nodes to the canvas first.");
        return;
      }
      const nlSpec = generateNL(nodes, activeSource);
      let prompt = nlSpec;
      if (userNote?.trim()) {
        addMessage("user", userNote);
        prompt += `\n\nAdditional instructions from user:\n${userNote}`;
      }
      addMessage(
        "system",
        "Generating workflow spec and requesting changes...",
      );
      if (!serverConnected) {
        addMessage(
          "system",
          "temporal-playground not running. Copy the spec from the bottom panel.",
        );
        return;
      }
      const ok = await postPrompt(prompt, "apply");
      addMessage(
        "system",
        ok
          ? "Spec sent to Claude \u2014 waiting for confirmation..."
          : "Failed to send. Copy the spec from the bottom panel.",
      );
    },
    [nodes, activeSource, serverConnected, addMessage],
  );

  return { sendChat, applyChanges };
}
