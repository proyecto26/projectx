import type { WorkflowMetadata } from "../types";
import { BASE_URL } from "./config";

export async function fetchWorkflows(): Promise<WorkflowMetadata[]> {
  const resp = await fetch(`${BASE_URL}/api/workflows`);
  if (!resp.ok) return [];
  const data: WorkflowMetadata[] = await resp.json();
  console.log(
    "[api] fetchWorkflows response:",
    data.map((w) => ({ name: w.name, params: w.params })),
  );
  return data;
}

export async function postPrompt(
  prompt: string,
  type: "chat" | "apply" = "chat",
): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        type,
        url: location.href,
        pathname: location.pathname,
      }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
