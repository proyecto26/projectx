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

import { defineWorkflow, WorkflowClient } from "../client";
import type {
  WorkflowEvent,
  WorkflowSubscribeOptions,
  WorkflowTransport,
} from "../types";
import { WorkflowClientProvider } from "./context";
import { useWorkflow } from "./useWorkflow";
import { useWorkflows } from "./useWorkflows";

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

  it("uses the client of the provider and keeps following on unmount", async () => {
    const storage = new Map<string, string>();
    const transport = transportWith(async function* ({ signal }) {
      yield { type: "state", state: "live" };
      await hang(signal);
    });
    const workflow = defineWorkflow<string, unknown, string>({
      type: "test",
      transport,
    });
    const client = new WorkflowClient({
      workflows: [workflow],
      storageKey: "key",
      storage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => void storage.set(key, value),
        removeItem: (key) => void storage.delete(key),
      },
    });
    const seen: string[] = [];
    const Child = () => {
      const current = useWorkflow({ workflow, id: "a" });
      const list = useWorkflows({ workflow });
      seen.push(`${current.state}:${list.length}`);
      return <button type="button" onClick={() => current.start({})} />;
    };
    const app = render(
      <WorkflowClientProvider client={client}>
        <Child />
      </WorkflowClientProvider>,
    );
    expect(client.isHydrated).toBe(true);

    await act(async () => {
      app.container.querySelector("button")?.click();
    });
    await waitFor(() => expect(seen.at(-1)).toBe("live:1"));
    expect(storage.get("key:test")).toContain("live");

    // Only the provider going away stops it
    app.rerender(
      <WorkflowClientProvider client={client}>
        <div />
      </WorkflowClientProvider>,
    );
    expect(transport.subscribe.mock.calls.at(-1)?.[0].signal.aborted).toBe(
      false,
    );
    app.unmount();
    expect(transport.subscribe.mock.calls.at(-1)?.[0].signal.aborted).toBe(
      true,
    );
  });

  it("removes a workflow from its client, keeping the state on screen", async () => {
    const transport = transportWith(async function* ({ signal }) {
      yield { type: "state", state: "one" };
      await hang(signal);
    });
    const workflow = defineWorkflow<string, unknown, string>({
      type: "test",
      transport,
    });
    const client = new WorkflowClient({ workflows: [workflow] });
    const { result } = renderHook(() =>
      useWorkflow({ workflow, id: "a", client }),
    );
    await act(() => result.current.start({}));
    await waitFor(() => expect(result.current.state).toBe("one"));

    act(() => result.current.remove());

    expect(client.has(workflow, "a")).toBe(false);
    expect(result.current.state).toBe("one");
    expect(transport.subscribe.mock.calls.at(-1)?.[0].signal.aborted).toBe(
      true,
    );
  });

  it("explains what is missing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      renderHook(() =>
        useWorkflow({
          workflow: defineWorkflow({
            type: "test",
            transport: transportWith(async function* () {}),
          }),
          id: "a",
        }),
      ),
    ).toThrow("WorkflowClientProvider");
    spy.mockRestore();
  });
});

describe("useWorkflows", () => {
  type State = { status: string };
  const makeClient = () => {
    const listeners = new Map<string, (state: State) => void>();
    const transport: WorkflowTransport<State> = {
      start: vi.fn(async () => ({ status: "Pending" })),
      cancel: vi.fn(async () => undefined),
      subscribe: ({ id, signal }) =>
        (async function* (): AsyncGenerator<WorkflowEvent<State>> {
          const state = await new Promise<State>((resolve, reject) => {
            listeners.set(id, resolve);
            signal.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError")),
            );
          });
          yield { type: "finish", state, status: "COMPLETED" };
        })(),
    };
    const workflow = defineWorkflow<State>({ type: "order", transport });
    const other = defineWorkflow<State>({ type: "payment", transport });
    const client = new WorkflowClient({ workflows: [workflow, other] });
    return { client, workflow, other, listeners };
  };

  it("reads all the workflows, a subset in order, and a combined value", async () => {
    const { client, workflow, listeners } = makeClient();
    client.session(workflow, "a").resume();
    client.session(workflow, "b").resume();
    client.session(workflow, "c").resume();
    const combine = (items: ReadonlyArray<{ status: string }>) =>
      items.filter(({ status }) => status === "running").length;

    const { result } = renderHook(() => ({
      all: useWorkflows({ workflow, client }),
      subset: useWorkflows({ workflow, client, ids: ["c", "a", "unknown"] }),
      running: useWorkflows({ workflow, client, combine }),
    }));
    expect(result.current.all.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(result.current.subset.map(({ id }) => id)).toEqual(["c", "a"]);
    expect(result.current.running).toBe(3);

    await waitFor(() => expect(listeners.size).toBe(3));
    act(() => listeners.get("a")?.({ status: "Done" }));
    await waitFor(() => expect(result.current.running).toBe(2));
    client.stop();
  });

  it("filters by type or reads every type", () => {
    const { client, workflow, other } = makeClient();
    client.session(workflow, "a").resume();
    client.session(other, "b").resume();

    const { result } = renderHook(() => ({
      orders: useWorkflows({ workflow, client }),
      payments: useWorkflows({ type: "payment", client }),
      all: useWorkflows({ client }),
    }));
    expect(result.current.orders.map(({ id }) => id)).toEqual(["a"]);
    expect(result.current.payments.map(({ id }) => id)).toEqual(["b"]);
    expect(result.current.all.map(({ type }) => type)).toEqual([
      "order",
      "payment",
    ]);
    client.stop();
  });

  it("keeps the same reference until something changes", () => {
    const { client, workflow } = makeClient();
    client.session(workflow, "a").resume();
    const { result, rerender } = renderHook(() =>
      useWorkflows({ workflow, client, ids: ["a"] }),
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    client.stop();
  });
});
