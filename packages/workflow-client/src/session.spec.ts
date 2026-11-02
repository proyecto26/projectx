import { describe, expect, it, vi } from "vitest";

import { WorkflowRegistry, type WorkflowStorage } from "./registry";
import { WorkflowSession } from "./session";
import {
  WorkflowClientError,
  type WorkflowEvent,
  type WorkflowSubscribeOptions,
  type WorkflowTransport,
} from "./types";

type State = { status: string };
type Script = (
  options: WorkflowSubscribeOptions,
  attempt: number,
) => AsyncGenerator<WorkflowEvent<State>>;

const hang = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });

function fakeTransport(script: Script) {
  let attempt = 0;
  const offsets: Array<number | undefined> = [];
  const transport = {
    start: vi.fn(async () => ({ orderId: 1 })),
    cancel: vi.fn(async () => undefined),
    subscribe: (options: WorkflowSubscribeOptions) => {
      offsets.push(options.fromOffset);
      return script(options, attempt++);
    },
  } satisfies WorkflowTransport<State, unknown, { orderId: number }>;
  return { transport, offsets };
}

const fast = { initialDelayMs: 1, maxDelayMs: 2 };
const settled = (
  session: { getSnapshot: () => { status: string } },
  status: string,
) => vi.waitFor(() => expect(session.getSnapshot().status).toBe(status));

describe("WorkflowSession", () => {
  it("starts, follows and finishes", async () => {
    const { transport } = fakeTransport(async function* () {
      yield { type: "state", state: { status: "Pending" }, offset: 1 };
      yield { type: "finish", state: { status: "Done" }, status: "COMPLETED" };
    });
    const onFinish = vi.fn();
    const onState = vi.fn();
    const session = new WorkflowSession({
      id: "a",
      transport,
      onFinish,
      onState,
    });

    await session.start({});
    await settled(session, "finished");

    const snapshot = session.getSnapshot();
    expect(snapshot.result).toEqual({ orderId: 1 });
    expect(snapshot.state).toEqual({ status: "Done" });
    expect(snapshot.executionStatus).toBe("COMPLETED");
    expect(onState).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("never starts a workflow twice", async () => {
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    const { transport } = fakeTransport(async function* ({ signal }) {
      await hang(signal);
    });
    const session = new WorkflowSession({ id: "a", transport });

    await Promise.all([session.start({}), session.start({})]);
    await session.start({});
    session.stop();
    await session.start({});

    expect(transport.start).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().status).toBe("running");
    session.stop();
  });

  it("finishes when a business state is final, without a finish event", async () => {
    const { transport } = fakeTransport(async function* ({ signal }) {
      yield { type: "state", state: { status: "Confirmed" } };
      await hang(signal);
    });
    const session = new WorkflowSession<State, unknown, { orderId: number }>({
      id: "a",
      transport,
      isFinal: ({ status }) => status === "Confirmed",
    });

    await session.start({});
    await settled(session, "finished");
  });

  it("reconnects from the last offset when the connection closes", async () => {
    const { transport, offsets } = fakeTransport(async function* (_, attempt) {
      if (attempt === 0) {
        yield { type: "state", state: { status: "One" }, offset: 3 };
        return;
      }
      if (attempt === 1) throw new TypeError("Network error");
      yield { type: "finish", status: "COMPLETED" };
    });
    const session = new WorkflowSession({
      id: "a",
      transport,
      reconnect: fast,
    });

    await session.start({});
    await settled(session, "finished");

    expect(offsets).toEqual([undefined, 3, 3]);
    // A finish event with no state keeps the last one
    expect(session.getSnapshot().state).toEqual({ status: "One" });
  });

  it("stops on fatal errors and after too many attempts", async () => {
    const onError = vi.fn();
    const fatal = new WorkflowSession({
      id: "a",
      // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
      transport: fakeTransport(async function* () {
        throw new WorkflowClientError("Forbidden", { status: 403 });
      }).transport,
      reconnect: fast,
      onError,
    });
    await fatal.start({});
    await settled(fatal, "error");
    expect(onError).toHaveBeenCalledTimes(1);

    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    const { transport, offsets } = fakeTransport(async function* () {
      throw new TypeError("Network error");
    });
    const limited = new WorkflowSession({
      id: "b",
      transport,
      reconnect: { ...fast, maxAttempts: 3 },
    });
    await limited.start({});
    await settled(limited, "error");
    expect(offsets).toHaveLength(3);
  });

  it("treats an error event as fatal and keeps its code", async () => {
    const session = new WorkflowSession({
      id: "a",
      transport: fakeTransport(async function* () {
        yield { type: "error", message: "Gone", code: "not_found" };
      }).transport,
    });
    await session.start({});
    await settled(session, "error");
    expect(session.getSnapshot().error).toMatchObject({
      message: "Gone",
      code: "not_found",
    });
  });

  it("stop aborts the connection and resume follows again", async () => {
    const signals: AbortSignal[] = [];
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    const { transport } = fakeTransport(async function* ({ signal }) {
      signals.push(signal);
      await hang(signal);
    });
    const session = new WorkflowSession({ id: "a", transport });

    session.resume();
    await vi.waitFor(() => expect(signals).toHaveLength(1));
    session.stop();
    expect(signals[0]?.aborted).toBe(true);
    expect(session.getSnapshot().status).toBe("idle");

    session.resume();
    await vi.waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[1]?.aborted).toBe(false);
    session.stop();
  });

  it("keeps following after a cancellation until the workflow ends", async () => {
    let finish: () => void = () => undefined;
    const ended = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const { transport } = fakeTransport(async function* () {
      await ended;
      yield { type: "finish", state: { status: "Failed" }, status: "FAILED" };
    });
    const session = new WorkflowSession({ id: "a", transport });

    await session.start({});
    await session.cancel();
    expect(transport.cancel).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().isCancelling).toBe(true);
    await session.cancel();
    expect(transport.cancel).toHaveBeenCalledTimes(1);

    finish();
    await settled(session, "finished");
    expect(session.getSnapshot().isCancelling).toBe(false);
  });

  it("gives the error back when a cancellation fails", async () => {
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    const { transport } = fakeTransport(async function* ({ signal }) {
      await hang(signal);
    });
    transport.cancel.mockRejectedValueOnce(new Error("Nope"));
    const session = new WorkflowSession({ id: "a", transport });
    await session.start({});

    await expect(session.cancel()).rejects.toThrow("Nope");
    expect(session.getSnapshot().isCancelling).toBe(false);
    expect(session.getSnapshot().status).toBe("running");
    session.stop();
  });

  it("reports failures to start", async () => {
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    const { transport } = fakeTransport(async function* () {});
    transport.start.mockRejectedValueOnce(
      new WorkflowClientError("Conflict", { status: 409 }),
    );
    const session = new WorkflowSession({ id: "a", transport });
    await session.start({});
    expect(session.getSnapshot().status).toBe("error");
    session.clearError();
    expect(session.getSnapshot().status).toBe("idle");
  });
});

const memoryStorage = (initial?: unknown): WorkflowStorage => {
  const data = new Map<string, string>();
  if (initial) data.set("key", JSON.stringify(initial));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

describe("WorkflowRegistry", () => {
  const hanging = () =>
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    fakeTransport(async function* ({ signal }) {
      await hang(signal);
    });

  it("resumes unfinished workflows without repeating finished ones", async () => {
    const now = Date.now();
    const { transport, offsets } = hanging();
    const onFinish = vi.fn();
    const registry = new WorkflowRegistry({
      transport,
      onFinish,
      storageKey: "key",
      storage: memoryStorage([
        {
          id: "done",
          status: "finished",
          state: { status: "Failed" },
          updatedAt: now,
        },
        {
          id: "open",
          status: "running",
          state: { status: "Pending" },
          offset: 2,
          updatedAt: now,
        },
        {
          id: "old",
          status: "running",
          state: { status: "Pending" },
          updatedAt: now - 1000 * 60 * 60 * 48,
        },
      ]),
    });

    registry.hydrate();

    expect(registry.isHydrated).toBe(true);
    expect(registry.list().map(({ id, status }) => [id, status])).toEqual([
      ["done", "finished"],
      ["open", "running"],
    ]);
    await vi.waitFor(() => expect(offsets).toEqual([2]));
    expect(onFinish).not.toHaveBeenCalled();
    registry.stop();
  });

  it("restores a session a component created before hydrating", () => {
    const { transport } = hanging();
    const registry = new WorkflowRegistry({
      transport,
      storageKey: "key",
      storage: memoryStorage([
        {
          id: "a",
          status: "running",
          result: { orderId: 7 },
          updatedAt: Date.now(),
        },
      ]),
    });
    const session = registry.session("a");
    expect(session.getSnapshot().result).toBeUndefined();

    registry.hydrate();

    expect(session.getSnapshot().result).toEqual({ orderId: 7 });
    expect(session.getSnapshot().status).toBe("running");
    registry.stop();
  });

  it("doesn't overwrite storage before hydrating, then keeps it updated", async () => {
    const storage = memoryStorage([
      { id: "a", status: "finished", state: 1, updatedAt: Date.now() },
    ]);
    const { transport } = fakeTransport(async function* () {
      yield { type: "finish", state: { status: "Done" }, status: "COMPLETED" };
    });
    const registry = new WorkflowRegistry<State, unknown, { orderId: number }>({
      transport,
      storage,
      storageKey: "key",
    });

    await registry.session("b").start({});
    await settled(registry.session("b"), "finished");
    expect(JSON.parse(storage.getItem("key") ?? "")).toHaveLength(1);

    registry.hydrate();
    const stored = JSON.parse(storage.getItem("key") ?? "");
    expect(stored.map(({ id }: { id: string }) => id).sort()).toEqual([
      "a",
      "b",
    ]);

    registry.remove("b");
    expect(JSON.parse(storage.getItem("key") ?? "")).toHaveLength(1);
  });

  it("ignores broken storage", () => {
    const storage = memoryStorage();
    storage.setItem("key", "{not json");
    const registry = new WorkflowRegistry({
      transport: hanging().transport,
      storage,
      storageKey: "key",
    });
    registry.hydrate();
    expect(registry.list()).toEqual([]);
  });
});
