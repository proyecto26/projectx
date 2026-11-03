import type {
  SignalDefinition,
  UpdateDefinition,
  WorkflowHandle,
} from "@temporalio/client";
import { describe, expect, it, vi } from "vitest";

import { signal, update } from "./actions";
import { defineWorkflow, WorkflowClient } from "./client";
import {
  defineServerActions,
  signalAction,
  updateAction,
} from "./server/actions";
import { WorkflowSession } from "./session";
import { createFallbackTransport } from "./transports/fallback";
import { createHttpStreamTransport } from "./transports/http-stream";
import { createLimitedTransport } from "./transports/limited";
import { createPollingTransport } from "./transports/polling";
import { WorkflowClientError, type WorkflowTransport } from "./types";

const actions = {
  addItem: update<{ item: string }, { count: number }>(),
  ping: signal(),
};

const hang = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });

function fake(overrides: Partial<WorkflowTransport<string>> = {}) {
  return {
    send: vi.fn<NonNullable<WorkflowTransport<string>["send"]>>(async () => ({
      count: 1,
    })),
    start: vi.fn(async () => "started"),
    cancel: vi.fn(async () => undefined),
    async *subscribe({ signal }: { signal: AbortSignal }) {
      yield { type: "state" as const, state: "live" };
      await hang(signal);
    },
    ...overrides,
  } as WorkflowTransport<string> & {
    start: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
  };
}

describe("session.actions", () => {
  it("sends and returns the result, with an id for retries", async () => {
    const transport = fake();
    const session = new WorkflowSession({ id: "a", transport, actions });
    await expect(session.actions.addItem({ item: "x" })).resolves.toEqual({
      count: 1,
    });
    expect(transport.send.mock.calls[0]).toEqual([
      expect.objectContaining({
        id: "a",
        action: "addItem",
        input: { item: "x" },
        actionId: expect.any(String),
      }),
    ]);
  });

  it("lets the caller choose the actionId", async () => {
    const transport = fake();
    const session = new WorkflowSession({ id: "a", transport, actions });
    await session.actions.addItem({ item: "x" }, { actionId: "retry" });
    expect(transport.send.mock.calls[0]).toEqual([
      expect.objectContaining({ actionId: "retry" }),
    ]);
  });

  it("keeps following when an action is rejected", async () => {
    const transport = fake({
      send: vi.fn(async () => {
        throw new WorkflowClientError("Nope", { status: 422 });
      }),
    });
    const onError = vi.fn();
    const session = new WorkflowSession({
      id: "a",
      transport,
      onError,
      actions,
    });
    await session.start({});
    await expect(session.actions.addItem({ item: "x" })).rejects.toThrow(
      "Nope",
    );
    expect(session.getSnapshot()).toMatchObject({
      status: "running",
      error: undefined,
    });
    expect(onError).not.toHaveBeenCalled();
    session.stop();
  });

  it("explains a transport without actions", async () => {
    const { send: _, ...transport } = fake();
    const session = new WorkflowSession({ id: "a", transport, actions });
    await expect(session.actions.addItem({ item: "x" })).rejects.toThrow(
      "can't send",
    );
  });

  it("waits for the start and uses the id of the backend", async () => {
    const transport = fake();
    const session = new WorkflowSession({
      id: "a",
      transport,
      actions,
      resolveId: () => "b",
    });
    void session.start({});
    await session.actions.addItem({ item: "x" });
    expect(transport.send.mock.calls[0]).toEqual([
      expect.objectContaining({ id: "b" }),
    ]);
    session.stop();
  });

  it.each([
    ["the start fails", (_: { stop(): void }) => undefined, true],
    ["it stops while starting", (s: { stop(): void }) => s.stop(), false],
  ])("rejects without sending when %s", async (_name, act, fails) => {
    const transport = fake({
      start: vi.fn(({ signal }) =>
        fails ? Promise.reject(new Error("Rejected")) : hang(signal),
      ),
    });
    const session = new WorkflowSession({ id: "a", transport, actions });
    void session.start({});
    const sent = session.actions.addItem({ item: "x" });
    act(session);
    await expect(sent).rejects.toThrow("didn't start");
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("rejects without sending when another session has the id", async () => {
    const transport = fake();
    const session = new WorkflowSession({
      id: "a",
      transport,
      actions,
      resolveId: () => "b",
      onIdChange: () => false,
    });
    void session.start({});
    await expect(session.actions.addItem({ item: "x" })).rejects.toThrow(
      "didn't start",
    );
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("isn't aborted by stop", async () => {
    let signal: AbortSignal | undefined;
    const transport = fake({
      send: vi.fn(async (options) => {
        signal = options.signal;
        return { count: 2 };
      }),
    });
    const session = new WorkflowSession({ id: "a", transport, actions });
    const sent = session.actions.addItem({ item: "x" });
    session.stop();
    await expect(sent).resolves.toEqual({ count: 2 });
    expect(signal).toBeUndefined();
  });
});

describe("session.actions while starting", () => {
  it("waits when sent by a listener of the starting state", async () => {
    const transport = fake();
    const session = new WorkflowSession({
      id: "a",
      transport,
      actions,
      resolveId: () => "b",
    });
    let sent: Promise<unknown> | undefined;
    session.subscribe(() => {
      if (session.getSnapshot().status === "starting" && !sent) {
        sent = session.actions.ping();
      }
    });
    await session.start({});
    await sent;
    expect(transport.send.mock.calls[0]).toEqual([
      expect.objectContaining({ id: "b" }),
    ]);
    session.stop();
  });

  it("stops waiting when aborted, and sends nothing", async () => {
    const transport = fake({
      start: vi.fn(({ signal }) => hang(signal)),
    });
    const session = new WorkflowSession({ id: "a", transport, actions });
    void session.start({});
    const controller = new AbortController();
    const sent = session.actions.addItem(
      { item: "x" },
      { signal: controller.signal },
    );
    controller.abort();
    await expect(sent).rejects.toMatchObject({ name: "AbortError" });
    expect(transport.send).not.toHaveBeenCalled();
    session.stop();
  });
});

describe("generated actions", () => {
  it("sends the name of the key, with or without input", async () => {
    const transport = fake();
    const session = new WorkflowSession({ id: "a", transport, actions });
    await session.actions.ping();
    expect(transport.send.mock.calls[0]).toEqual([
      expect.objectContaining({ action: "ping", input: undefined }),
    ]);
    expect(Object.keys(session.actions)).toEqual(["addItem", "ping"]);
  });

  it("come from the definition through the client", async () => {
    const transport = fake();
    const workflow = defineWorkflow({ type: "o", transport, actions });
    const client = new WorkflowClient({ workflows: [workflow] });
    await client.session(workflow, "a").actions.addItem({ item: "x" });
    expect(transport.send.mock.calls[0]).toEqual([
      expect.objectContaining({ id: "a", action: "addItem" }),
    ]);
  });
});

describe("transports", () => {
  const options = { id: "a", action: "x", input: 1 };

  it("forward actions through every wrapper", async () => {
    const primary = fake();
    const polling = createPollingTransport<string>({
      start: primary.start,
      cancel: primary.cancel,
      send: primary.send,
      getState: async () => "s",
    });
    await polling.send?.(options);
    await createFallbackTransport(primary, polling).send?.(options);
    await createLimitedTransport(primary, polling).send?.(options);
    expect(primary.send).toHaveBeenCalledTimes(3);
  });

  it("stay without send when the primary has none", () => {
    const { send: _, ...primary } = fake();
    expect(createFallbackTransport(primary, primary).send).toBeUndefined();
    expect(createLimitedTransport(primary, primary).send).toBeUndefined();
  });

  it("post actions, with a result or without one", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ count: 3 }))
      .mockResolvedValueOnce(new Response(null, { status: 202 }));
    const transport = createHttpStreamTransport<string>({
      api: "/orders",
      headers: () => ({ authorization: "token" }),
      fetch,
    });
    await expect(
      transport.send?.({
        id: "a/b",
        action: "add item",
        input: 1,
        actionId: "z",
      }),
    ).resolves.toEqual({ count: 3 });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe("/orders/a%2Fb/actions/add%20item");
    expect(init).toMatchObject({
      method: "POST",
      headers: { authorization: "token" },
    });
    expect(JSON.parse(init.body)).toEqual({ input: 1, actionId: "z" });
    await expect(transport.send?.(options)).resolves.toBeUndefined();
  });

  it("read the explanation of a rejection, or use the status", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { message: "Too late", code: "rejected" },
          { status: 422 },
        ),
      )
      .mockResolvedValueOnce(new Response("<html>", { status: 500 }));
    const transport = createHttpStreamTransport<string>({ api: "/o", fetch });
    await expect(transport.send?.(options)).rejects.toMatchObject({
      message: "Too late",
      status: 422,
      code: "rejected",
    });
    await expect(transport.send?.(options)).rejects.toMatchObject({
      message: "The request failed with status 500",
      status: 500,
    });
  });
});

describe("defineServerActions", () => {
  const named = (name: string, cause?: Error) =>
    Object.assign(new Error(`secret ${name}`), { name, cause });
  const makeHandle = (overrides: Partial<Record<string, unknown>> = {}) =>
    ({
      signal: vi.fn(async () => undefined),
      executeUpdate: vi.fn(async () => ({ count: 1 })),
      ...overrides,
    }) as unknown as WorkflowHandle;
  const contract = {
    approve: signal<{ ok: boolean }>(),
    add: update<{ item: string }, { count: number }>(),
  };
  const approveSignal = {
    type: "signal",
    name: "approveS",
  } as SignalDefinition<[{ ok: boolean }]>;
  const addUpdate = { type: "update", name: "addU" } as UpdateDefinition<
    { count: number },
    [{ item: string }]
  >;
  const server = defineServerActions(contract, {
    approve: signalAction(approveSignal),
    add: updateAction(addUpdate),
  });

  it("refuses an implementation that doesn't match the declaration", () => {
    const check = (implementation: unknown) => () =>
      defineServerActions(contract, implementation as never);
    expect(check({ approve: signalAction(approveSignal) })).toThrow('"add"');
    expect(
      check({
        approve: updateAction(addUpdate),
        add: updateAction(addUpdate),
      }),
    ).toThrow('"approve" is declared as signal but implemented as update');
    expect(
      check({
        approve: signalAction(approveSignal),
        add: updateAction(addUpdate),
        extra: signalAction(approveSignal),
      }),
    ).toThrow('"extra"');
  });

  it("runs a signal and answers without a body", async () => {
    const handle = makeHandle();
    const response = await server.handle({
      handle,
      name: "approve",
      input: { ok: true },
    });
    expect(response.status).toBe(202);
    expect(handle.signal).toHaveBeenCalledWith("approveS", { ok: true });
  });

  it("runs an update with the actionId as its id", async () => {
    const handle = makeHandle();
    const response = await server.handle({
      handle,
      name: "add",
      input: { item: "x" },
      actionId: "z",
    });
    expect(await response.json()).toEqual({ count: 1 });
    expect(handle.executeUpdate).toHaveBeenCalledWith("addU", {
      args: [{ item: "x" }],
      updateId: "z",
    });
  });

  it.each([
    "unknown",
    "constructor",
    "__proto__",
    "toString",
  ])("doesn't let %s reach Temporal", async (name) => {
    const handle = makeHandle();
    const response = await server.handle({ handle, name });
    expect(response.status).toBe(404);
    expect(handle.signal).not.toHaveBeenCalled();
    expect(handle.executeUpdate).not.toHaveBeenCalled();
  });

  it.each([
    [
      "WorkflowNotFoundError",
      undefined,
      404,
      "not_found",
      "Workflow not found",
    ],
    [
      "WorkflowUpdateFailedError",
      Object.assign(new Error("Order is full"), { name: "ApplicationFailure" }),
      422,
      "rejected",
      "Order is full",
    ],
    [
      "WorkflowUpdateFailedError",
      named("Other"),
      422,
      "rejected",
      "The workflow rejected the action",
    ],
    [
      "WorkflowUpdateRPCTimeoutOrCancelledError",
      undefined,
      504,
      "outcome_unknown",
      "The workflow didn't answer in time. The action may still run",
    ],
  ])("maps %s", async (name, cause, status, code, message) => {
    const handle = makeHandle({
      executeUpdate: vi.fn(async () => {
        throw named(name, cause);
      }),
    });
    const response = await server.handle({ handle, name: "add" });
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ code, message });
  });

  it("leaves other failures to the server", async () => {
    const handle = makeHandle({
      signal: vi.fn(async () => {
        throw new Error("Connection lost");
      }),
    });
    await expect(server.handle({ handle, name: "approve" })).rejects.toThrow(
      "Connection lost",
    );
  });
});
