import { useCallback, useEffect } from "react";
import { BASE_URL } from "../lib/config";
import { useChatStore } from "../store/chat-store";
import { useWorkflowStore } from "../store/workflow-store";

export function useSSE() {
  const setServerConnected = useChatStore((s) => s.setServerConnected);
  const addMessage = useChatStore((s) => s.addMessage);
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const getNodes = useCallback(() => useWorkflowStore.getState().nodes, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        es = new EventSource(`${BASE_URL}/events`);

        es.onopen = () => setServerConnected(true);

        es.addEventListener("status", (e) => {
          try {
            const d = JSON.parse(e.data);
            if (d.status === "response" && d.response) {
              addMessage("claude", d.response);
            } else if (d.status === "processing") {
              addMessage("system", "Claude is working on your request...");
            } else if (d.status === "done") {
              addMessage("system", "Claude finished processing.");
            }
          } catch {
            /* ignore parse errors */
          }
        });

        es.addEventListener("canvas_update", (e) => {
          try {
            const d = JSON.parse(e.data);
            if (d.updates && Array.isArray(d.updates)) {
              // We need to apply canvas updates through the store
              const currentNodes = getNodes();
              let applied = 0;
              const updatedNodes = currentNodes.map((node) => {
                for (const upd of d.updates) {
                  if (node.type !== upd.nodeType) continue;
                  const matched = Object.entries(
                    upd.match as Record<string, unknown>,
                  ).every(
                    ([k, v]) => (node.data as Record<string, unknown>)[k] === v,
                  );
                  if (!matched) continue;
                  applied++;
                  return { ...node, data: { ...node.data, ...upd.set } };
                }
                return node;
              });
              if (applied > 0) {
                setNodes(updatedNodes);
                addMessage(
                  "system",
                  `Canvas updated: ${applied} node(s) modified.`,
                );
              }
            }
          } catch {
            /* ignore parse errors */
          }
        });

        es.onerror = () => {
          setServerConnected(false);
          es?.close();
          timeout = setTimeout(connect, 10000);
        };
      } catch {
        setServerConnected(false);
        timeout = setTimeout(connect, 10000);
      }
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(timeout);
    };
  }, [setServerConnected, addMessage, setNodes, getNodes]);
}
