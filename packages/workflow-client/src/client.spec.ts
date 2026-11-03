import { describe, expect, it, vi } from "vitest";

import { defineWorkflow, WorkflowClient } from "./client";
import { createLimitedTransport } from "./transports/limited";
import {
  WorkflowClientError,
  type WorkflowSubscribeOptions,
  type WorkflowTransport,
} from "./types";

type State = { status: string };

const hang = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });

const fake = (
  name: string,
  opened: string[] = [],
): WorkflowTransport<State> => ({
  start: vi.fn(async () => ({ status: name })),
  cancel: vi.fn(async () => undefined),
  async *subscribe({ id, signal }: WorkflowSubscribeOptions) {
    opened.push(`${name}:${id}`);
    yield { type: "state", state: { status: name } };
    await hang(signal);
  },
});

const memoryStorage = () => {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
};

describe("WorkflowClient", () => {
  const order = defineWorkflow<State>({
    type: "order",
    transport: fake("order"),
  });
  const payment = defineWorkflow<State>({
    type: "payment",
    transport: fake("payment"),
  });

  it("keeps each type with its transport and filters them", async () => {
    const client = new WorkflowClient({ workflows: [order, payment] });
    await client.session(order, "a").start({});
    await client.session(payment, "a").start({});
    await vi.waitFor(() =>
      expect(
        client.list().map((w) => (w.state as State | undefined)?.status),
      ).toEqual(["order", "payment"]),
    );

    expect(client.list({ workflow: order }).map((w) => w.type)).toEqual([
      "order",
    ]);
    expect(client.list({ type: "payment" }).map((w) => w.type)).toEqual([
      "payment",
    ]);
    expect(
      client.list({ predicate: ({ type }) => type === "order" }),
    ).toHaveLength(1);
    client.stop();
  });

  it("notifies the changes of every type", async () => {
    const client = new WorkflowClient({ workflows: [order, payment] });
    const listener = vi.fn();
    const unsubscribe = client.subscribe(listener);
    client.session(payment, "a").resume();
    expect(listener).toHaveBeenCalled();
    expect(client.list()).toBe(client.list());
    unsubscribe();
    client.stop();
  });

  it("stores and restores each type on its own key", async () => {
    const storage = memoryStorage();
    const options = { workflows: [order, payment], storage, storageKey: "u1" };
    const first = new WorkflowClient(options);
    first.hydrate();
    await first.session(order, "a").start({});
    await first.session(payment, "b").start({});
    await vi.waitFor(() =>
      expect(first.list().every((w) => w.state)).toBe(true),
    );
    first.stop();
    expect([...storage.items.keys()].sort()).toEqual([
      "u1:order",
      "u1:payment",
    ]);

    const second = new WorkflowClient(options);
    second.hydrate();
    expect(second.isHydrated).toBe(true);
    expect(second.has(order, "a")).toBe(true);
    expect(second.has(payment, "a")).toBe(false);
    expect(second.list({ workflow: payment }).map((w) => w.id)).toEqual(["b"]);
    expect(second.list({ workflow: payment })[0]?.type).toBe("payment");
    second.stop();
  });

  it("rejects a type it doesn't know and one defined twice", () => {
    const client = new WorkflowClient({ workflows: [order] });
    expect(() => client.session(payment, "a")).toThrow('"payment"');
    expect(() => new WorkflowClient({ workflows: [order, order] })).toThrow(
      "twice",
    );
  });

  it("gives its context to the transport and the lookup", async () => {
    const workflow = defineWorkflow<
      State,
      unknown,
      State,
      { token: () => string }
    >({
      type: "order",
      transport: ({ context }) => fake(context.token()),
      lookup: async ({ id, context }) => ({
        status: `${context.token()}:${id}`,
      }),
      isFinal: () => true,
    });
    const client = new WorkflowClient({
      workflows: [workflow],
      context: { token: () => "abc" },
    });
    expect(await client.find(workflow, "a")).toBe("found");
    expect(client.list({ workflow })[0]?.state?.status).toBe("abc:a");
    await expect(
      client
        .session(workflow, "b")
        .start({})
        .then(() => "ok"),
    ).resolves.toBe("ok");
    await vi.waitFor(() =>
      expect(client.list({ predicate: (w) => w.id === "b" })[0]?.state).toEqual(
        {
          status: "abc",
        },
      ),
    );
    client.stop();
  });

  it("shares the limit of streams between the types", async () => {
    const opened: string[] = [];
    const limited = (name: string) =>
      defineWorkflow<State>({
        type: name,
        transport: ({ limiter }) =>
          createLimitedTransport(
            fake(`stream-${name}`, opened),
            fake(`poll-${name}`, opened),
            { limiter },
          ),
      });
    const a = limited("a");
    const b = limited("b");
    const client = new WorkflowClient({ workflows: [a, b], maxStreams: 1 });
    client.session(a, "1").resume();
    await vi.waitFor(() => expect(opened).toEqual(["stream-a:1"]));
    client.session(b, "2").resume();
    await vi.waitFor(() => expect(opened).toContain("poll-b:2"));
    client.stop();
  });

  it("lets onError remove the workflow, and find what isn't there", async () => {
    const failing = fake("x");
    failing.subscribe = async function* () {
      yield* [] as never[];
      throw new WorkflowClientError("Gone", { status: 404 });
    };
    const workflow = defineWorkflow<State>({
      type: "order",
      transport: failing,
      lookup: async () => {
        throw new WorkflowClientError("Gone", { status: 404 });
      },
      onError: (_error, { result }, { remove }) => {
        if (result) remove();
      },
    });
    const client = new WorkflowClient({ workflows: [workflow] });
    expect(await client.find(workflow, "missing")).toBe("missing");
    await client.session(workflow, "a").start({});
    await vi.waitFor(() => expect(client.has(workflow, "a")).toBe(false));

    client.session(workflow, "b");
    client.remove(workflow, "b");
    expect(client.has(workflow, "b")).toBe(false);
    client.stop();
  });
});
