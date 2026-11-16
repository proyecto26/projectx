import { describe, expect, it } from "vitest";

import { type Lane, PermitFullError, PriorityPermit } from "../src";

/** Queues `lane` waiters on a held permit and records the grant order. */
function recorder(permit: PriorityPermit) {
  const order: string[] = [];
  const pending: Promise<void>[] = [];
  const wait = (lane: Lane, name: string, signal?: AbortSignal) => {
    const p = permit.acquire(lane, signal).then((release) => {
      order.push(name);
      release();
    });
    pending.push(p.catch(() => undefined));
    return p;
  };
  return { order, wait, settle: () => Promise.all(pending) };
}

describe("PriorityPermit", () => {
  it("grants immediately when free", async () => {
    const permit = new PriorityPermit();
    const release = await permit.acquire("bulk");
    expect(permit.busy).toBe(true);
    release();
    expect(permit.busy).toBe(false);
  });

  it("serves query, then interactive, then bulk, FIFO within a lane", async () => {
    const permit = new PriorityPermit();
    const release = await permit.acquire("bulk");
    const { order, wait, settle } = recorder(permit);
    wait("bulk", "b1");
    wait("interactive", "i1");
    wait("bulk", "b2");
    wait("query", "q1");
    wait("interactive", "i2");
    wait("query", "q2");
    release();
    await settle();
    expect(order).toEqual(["q1", "q2", "i1", "i2", "b1", "b2"]);
  });

  it("holds one holder at a time", async () => {
    const permit = new PriorityPermit();
    let inside = 0;
    let maxInside = 0;
    await Promise.all(
      Array.from({ length: 30 }, async (_, i) => {
        const release = await permit.acquire(i % 3 === 0 ? "query" : "bulk");
        inside += 1;
        maxInside = Math.max(maxInside, inside);
        await new Promise((resolve) => setTimeout(resolve, 1));
        inside -= 1;
        release();
      }),
    ).catch(() => undefined);
    expect(maxInside).toBe(1);
  });

  it("lets a waiting lower lane through after the starvation limit", async () => {
    const permit = new PriorityPermit({
      starvationLimit: 3,
      maxWaiting: { query: 100 },
    });
    const release = await permit.acquire("query");
    const { order, wait, settle } = recorder(permit);
    wait("bulk", "b1");
    for (let i = 1; i <= 7; i++) wait("query", `q${i}`);
    release();
    await settle();
    // Three queries pass the waiting bulk item, then it runs
    expect(order).toEqual(["q1", "q2", "q3", "b1", "q4", "q5", "q6", "q7"]);
  });

  it("bounds starvation of every lower lane", async () => {
    const permit = new PriorityPermit({
      starvationLimit: 2,
      maxWaiting: { query: 100 },
    });
    const release = await permit.acquire("query");
    const { order, wait, settle } = recorder(permit);
    wait("bulk", "b1");
    wait("interactive", "i1");
    wait("interactive", "i2");
    for (let i = 1; i <= 4; i++) wait("query", `q${i}`);
    release();
    await settle();
    const b = order.indexOf("b1");
    expect(order.indexOf("i1")).toBe(2);
    // The bulk item never waits for more than 2 grants after it became due
    expect(b).toBeLessThanOrEqual(4);
    expect(order).toHaveLength(7);
  });

  it("refuses queries beyond the queue limit", async () => {
    const permit = new PriorityPermit({ maxWaiting: { query: 2 } });
    const release = await permit.acquire("bulk");
    const { wait, settle } = recorder(permit);
    wait("query", "q1");
    wait("query", "q2");
    await expect(permit.acquire("query")).rejects.toBeInstanceOf(
      PermitFullError,
    );
    // Other lanes are unbounded
    wait("bulk", "b1");
    release();
    await settle();
  });

  it("removes a waiter whose signal aborts, and serves the rest", async () => {
    const permit = new PriorityPermit();
    const release = await permit.acquire("bulk");
    const { order, wait, settle } = recorder(permit);
    const controller = new AbortController();
    const aborted = wait("query", "q1", controller.signal);
    wait("interactive", "i1");
    controller.abort(new Error("deadline"));
    await expect(aborted).rejects.toThrow("deadline");
    expect(permit.waiting("query")).toBe(0);
    release();
    await settle();
    expect(order).toEqual(["i1"]);
  });

  it("rejects at once when the signal is already aborted", async () => {
    const permit = new PriorityPermit();
    const controller = new AbortController();
    controller.abort();
    await expect(permit.acquire("query", controller.signal)).rejects.toThrow();
    expect(permit.busy).toBe(false);
  });

  it("ignores an abort after the permit was granted", async () => {
    const permit = new PriorityPermit();
    const controller = new AbortController();
    const release = await permit.acquire("query", controller.signal);
    controller.abort();
    expect(permit.busy).toBe(true);
    release();
    expect(permit.busy).toBe(false);
  });

  it("ignores a second release", async () => {
    const permit = new PriorityPermit();
    const first = await permit.acquire("bulk");
    const { order, wait, settle } = recorder(permit);
    let holding: (() => void) | undefined;
    const second = permit.acquire("bulk").then((release) => {
      holding = release;
    });
    wait("bulk", "b3");
    first();
    await second;
    // A stale second call must not release the new holder's permit
    first();
    expect(permit.busy).toBe(true);
    expect(order).toEqual([]);
    holding?.();
    await settle();
    expect(order).toEqual(["b3"]);
  });
});
