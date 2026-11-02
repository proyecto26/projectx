// @vitest-environment jsdom
import {
  act,
  cleanup,
  render,
  renderHook,
  waitFor,
} from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowRegistry } from "../registry";
import type {
  WorkflowEvent,
  WorkflowSubscribeOptions,
  WorkflowTransport,
} from "../types";
import { WorkflowRegistryProvider } from "./context";
import { useWorkflow } from "./useWorkflow";
import { useWorkflowList } from "./useWorkflowList";

afterEach(cleanup);

const hang = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });

function transportWith(
  subscribe: (
    o: WorkflowSubscribeOptions,
  ) => AsyncGenerator<WorkflowEvent<string>>,
) {
  return {
    start: vi.fn(async () => "started"),
    cancel: vi.fn(async () => undefined),
    subscribe: vi.fn(subscribe),
  } satisfies WorkflowTransport<string, unknown, string>;
}

describe("useWorkflow", () => {
  it("renders the updates and calls the latest callback", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const transport = transportWith(async function* () {
      yield { type: "state", state: "one" };
      await gate;
      yield { type: "finish", state: "two", status: "COMPLETED" };
    });
    const first = vi.fn();
    const latest = vi.fn();
    const { result, rerender } = renderHook(
      ({ onFinish }) => useWorkflow({ id: "a", transport, onFinish }),
      { initialProps: { onFinish: first } },
    );

    expect(result.current.status).toBe("idle");
    await act(() => result.current.start({}));
    await waitFor(() => expect(result.current.state).toBe("one"));
    expect(result.current.result).toBe("started");
    expect(result.current.isActive).toBe(true);

    rerender({ onFinish: latest });
    release();
    await waitFor(() => expect(result.current.status).toBe("finished"));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledTimes(1);
  });

  it("works in Strict Mode, stopping on unmount", async () => {
    const signals: AbortSignal[] = [];
    const transport = transportWith(async function* ({ signal }) {
      signals.push(signal);
      yield { type: "state", state: "live" };
      await hang(signal);
    });
    const { result, unmount } = renderHook(
      () => useWorkflow({ id: "a", transport, resume: true }),
      {
        wrapper: ({ children }: { children: ReactNode }) => (
          <StrictMode>{children}</StrictMode>
        ),
      },
    );
    await waitFor(() => expect(result.current.state).toBe("live"));
    unmount();
    expect(signals.at(-1)?.aborted).toBe(true);
  });

  it("creates a new session when the id changes", async () => {
    const transport = transportWith(async function* ({ id, signal }) {
      yield { type: "state", state: id };
      await hang(signal);
    });
    const { result, rerender } = renderHook(
      ({ id }) => useWorkflow({ id, transport, resume: true }),
      { initialProps: { id: "a" } },
    );
    await waitFor(() => expect(result.current.state).toBe("a"));
    rerender({ id: "b" });
    await waitFor(() => expect(result.current.state).toBe("b"));
    expect(result.current.id).toBe("b");
  });

  it("uses the registry of the provider and keeps following on unmount", async () => {
    const storage = new Map<string, string>();
    const transport = transportWith(async function* ({ signal }) {
      yield { type: "state", state: "live" };
      await hang(signal);
    });
    const registry = new WorkflowRegistry<string, unknown, string>({
      transport,
      storageKey: "key",
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => void storage.set(key, value),
        removeItem: (key) => void storage.delete(key),
      },
    });
    const seen: string[] = [];
    const Child = () => {
      const workflow = useWorkflow<string, unknown, string>({ id: "a" });
      const list = useWorkflowList<string, unknown, string>();
      seen.push(`${workflow.state}:${list.length}`);
      return <button type="button" onClick={() => workflow.start({})} />;
    };
    const app = render(
      <WorkflowRegistryProvider registry={registry}>
        <Child />
      </WorkflowRegistryProvider>,
    );
    expect(registry.isHydrated).toBe(true);

    await act(async () => {
      app.container.querySelector("button")?.click();
    });
    await waitFor(() => expect(seen.at(-1)).toBe("live:1"));
    expect(storage.get("key")).toContain("live");

    // Only the provider going away stops it
    app.rerender(
      <WorkflowRegistryProvider registry={registry}>
        <div />
      </WorkflowRegistryProvider>,
    );
    expect(transport.subscribe.mock.calls.at(-1)?.[0].signal.aborted).toBe(
      false,
    );
    app.unmount();
    expect(transport.subscribe.mock.calls.at(-1)?.[0].signal.aborted).toBe(
      true,
    );
  });

  it("explains what is missing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useWorkflow({ id: "a" }))).toThrow(
      "WorkflowRegistryProvider",
    );
    spy.mockRestore();
  });
});
