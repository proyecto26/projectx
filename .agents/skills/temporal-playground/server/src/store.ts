import type { PlaygroundPrompt } from "./types.js";

class PromptStore {
  private prompts: PlaygroundPrompt[] = [];

  add(prompt: Omit<PlaygroundPrompt, "id" | "timestamp"> & { type?: string }): PlaygroundPrompt {
    const entry: PlaygroundPrompt = {
      ...prompt,
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    this.prompts.push(entry);
    return entry;
  }

  getOldest(): PlaygroundPrompt | undefined {
    return this.prompts[0];
  }

  getAll(): PlaygroundPrompt[] {
    return [...this.prompts];
  }

  count(): number {
    return this.prompts.length;
  }

  clear(): void {
    this.prompts = [];
  }

  removeOldest(): PlaygroundPrompt | undefined {
    return this.prompts.shift();
  }
}

export const store = new PromptStore();
