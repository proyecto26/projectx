import type { Client, WorkflowHandle } from "@temporalio/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { queryPollingEvents, workflowStreamEvents } from "./temporal";

const items = vi.hoisted(() => ({
  subscribe: vi.fn(),
}));

vi.mock("@temporalio/workflow-streams/client", () => ({
  WorkflowStreamClient: {
    create: () => ({ topic: () => ({ subscribe: items.subscribe }) }),
  },
}));

const named = (name: string) => Object.assign(new Error(name), { name });

function fake(options: {
  statuses: string[];
  states?: unknown[];
  query?: () => Promise<number>;
}) {
  const statuses = [...options.statuses];
  const states = [...(options.states ?? [])];
  const handle = {
    describe: vi.fn(async () => ({
      status: { name: statuses.length > 1 ? statuses.shift() : statuses[0] },
    })),
    query: vi.fn(options.query ?? (async () => 5)),
  } as unknown as WorkflowHandle;
  const client = {
    workflow: { getHandle: () => handle },
  } as unknown as Client;
  const getState = vi.fn(async () =>
    states.length > 1 ? states.shift() : states[0],
  );
  return { handle, client, getState };
}

const collect = async <T>(events: AsyncIterable<T>) => {
  const result: T[] = [];
  for await (const event of events) result.push(event);
  return result;
};

afterEach(() => items.subscribe.mockReset());

describe("workflowStreamEvents", () => {
  it("sends a snapshot, the items after it, and the final state", async () => {
    const { client, getState } = fake({
      statuses: ["RUNNING", "FAILED"],
      states: ["snapshot", "final"],
    });
    items.subscribe.mockImplementation(async function* () {
      yield { topic: "state", offset: 5, data: "published" };
    });

    await expect(
      collect(workflowStreamEvents({ client, workflowId: "w", getState })),
    ).resolves.toEqual([
      { type: "state", state: "snapshot", offset: 5 },
      { type: "state", state: "published", offset: 6 },
      { type: "finish", state: "final", status: "FAILED", offset: 6 },
    ]);
    // Reads from the position taken before the snapshot, not from the start
    expect(items.subscribe).toHaveBeenCalledWith(5);
  });

  it("replays from the offset when there is no snapshot", async () => {
    const { client } = fake({ statuses: ["RUNNING", "COMPLETED"] });
    items.subscribe.mockImplementation(async function* () {
      yield { topic: "state", offset: 2, data: "delta" };
    });
    await expect(
      collect(workflowStreamEvents({ client, workflowId: "w", fromOffset: 2 })),
    ).resolves.toEqual([
      { type: "state", state: "delta", offset: 3 },
      { type: "finish", status: "COMPLETED", offset: 3 },
    ]);
    expect(items.subscribe).toHaveBeenCalledWith(2);
  });

  it("answers directly when the workflow already closed", async () => {
    const { client, getState } = fake({
      statuses: ["COMPLETED"],
      states: ["final"],
    });
    await expect(
      collect(workflowStreamEvents({ client, workflowId: "w", getState })),
    ).resolves.toEqual([
      { type: "finish", state: "final", status: "COMPLETED" },
    ]);
    expect(items.subscribe).not.toHaveBeenCalled();
  });

  it("reports a missing workflow as not found", async () => {
    const { client, handle } = fake({ statuses: ["RUNNING"] });
    vi.mocked(handle.describe).mockRejectedValueOnce(
      named("WorkflowNotFoundError"),
    );
    await expect(
      collect(workflowStreamEvents({ client, workflowId: "w" })),
    ).resolves.toEqual([
      { type: "error", message: "Workflow not found", code: "not_found" },
    ]);
  });

  it("queries workflows that don't publish to a stream", async () => {
    const { client, getState } = fake({
      statuses: ["RUNNING", "RUNNING", "COMPLETED"],
      states: ["old", "final"],
      query: async () => {
        throw named("QueryNotRegisteredError");
      },
    });
    await expect(
      collect(
        workflowStreamEvents({
          client,
          workflowId: "w",
          getState,
          intervalMs: 1,
        }),
      ),
    ).resolves.toEqual([
      { type: "state", state: "old" },
      { type: "finish", state: "final", status: "COMPLETED" },
    ]);
    expect(items.subscribe).not.toHaveBeenCalled();
  });

  it("stops waiting for items when the client disconnects", async () => {
    const { client, getState } = fake({
      statuses: ["RUNNING"],
      states: ["snapshot"],
    });
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    items.subscribe.mockImplementation(async function* () {
      await new Promise(() => undefined);
    });
    const controller = new AbortController();
    const events = workflowStreamEvents({
      client,
      workflowId: "w",
      getState,
      signal: controller.signal,
    });
    await events.next();
    const pending = events.next();
    controller.abort();
    await expect(pending).resolves.toEqual({ done: true, value: undefined });
  });

  it("lets unexpected errors reach the response", async () => {
    const { client, getState } = fake({
      statuses: ["RUNNING"],
      states: ["snapshot"],
    });
    // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
    items.subscribe.mockImplementation(async function* () {
      throw new Error("Temporal is down");
    });
    await expect(
      collect(workflowStreamEvents({ client, workflowId: "w", getState })),
    ).rejects.toThrow("Temporal is down");
  });
});

describe("queryPollingEvents", () => {
  it("stops quietly when aborted", async () => {
    const { handle, getState } = fake({
      statuses: ["RUNNING"],
      states: ["state"],
    });
    const controller = new AbortController();
    const events = queryPollingEvents({
      handle,
      getState,
      intervalMs: 10_000,
      signal: controller.signal,
    });
    await events.next();
    const pending = events.next();
    controller.abort();
    await expect(pending).resolves.toEqual({ done: true, value: undefined });
  });
});
