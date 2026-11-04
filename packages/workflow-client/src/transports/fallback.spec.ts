import { describe, expect, it, vi } from "vitest";
import type {
  WorkflowEvent,
  WorkflowSubscribeOptions,
  WorkflowTransport,
} from "../types";
import { sleep } from "../utils";
import { createFallbackTransport } from "./fallback";
import { createLimitedTransport, createStreamLimiter } from "./limited";

type Event = WorkflowEvent<number>;

const transport = (
  subscribe: (options: WorkflowSubscribeOptions) => AsyncIterable<Event>,
): WorkflowTransport<number> => ({
  start: vi.fn(),
  cancel: vi.fn(),
  subscribe,
});

const waitForAbort = (signal: AbortSignal) =>
  new Promise<never>((_, reject) => {
    if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", () =>
      reject(new DOMException("Aborted", "AbortError")),
    );
  });

/** Polls every 5 ms, yielding 100, 101, ... and recording its signals. */
const polling = (signals: AbortSignal[] = []) =>
  transport(async function* ({ signal }) {
    signals.push(signal);
    for (let state = 100; ; state++) {
      yield { type: "state", state };
      await sleep(5, signal);
    }
  });

/** Takes events until `until` returns true, then aborts the subscription. */
async function take(
  events: AsyncIterable<Event>,
  controller: AbortController,
  until: (seen: number[]) => boolean,
) {
  const seen: number[] = [];
  try {
    for await (const event of events) {
      if (event.type === "state") seen.push(event.state);
      if (until(seen)) break;
    }
  } finally {
    controller.abort();
  }
  return seen;
}

const fast = { initialDelayMs: 20, maxDelayMs: 80, timeoutMs: 40 };

describe("fallback transport with retryPrimary", () => {
  it("moves back to the primary when it works again", async () => {
    const pollSignals: AbortSignal[] = [];
    let calls = 0;
    const primary = transport(async function* ({ signal }) {
      calls++;
      if (calls === 1) throw new Error("Outage");
      yield { type: "state", state: 1 };
      yield { type: "state", state: 2 };
      await waitForAbort(signal);
    });
    const fallback = createFallbackTransport(primary, polling(pollSignals), {
      retryPrimary: fast,
    });
    const controller = new AbortController();
    const seen = await take(
      fallback.subscribe({ id: "a", signal: controller.signal }),
      controller,
      (states) => states.includes(2),
    );

    expect(seen[0]).toBe(100);
    expect(seen.slice(-2)).toEqual([1, 2]);
    expect(calls).toBe(2);
    // Polling stopped as soon as the stream was back
    expect(pollSignals[0]?.aborted).toBe(true);
  });

  it("keeps polling and waits longer after each failed try", async () => {
    const tries: number[] = [];
    const start = Date.now();
    // biome-ignore lint/correctness/useYield: A stream that fails before sending anything
    const primary = transport(async function* () {
      tries.push(Date.now() - start);
      throw new Error("Still down");
    });
    const onFallback = vi.fn();
    const fallback = createFallbackTransport(primary, polling(), {
      retryPrimary: fast,
      onFallback,
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 200);
    const seen: number[] = [];
    for await (const event of fallback.subscribe({
      id: "a",
      signal: controller.signal,
    })) {
      if (event.type === "state") seen.push(event.state);
    }
    clearTimeout(timer);

    // The first try and then retries after 20, 40 and 80 ms
    expect(tries.length).toBeGreaterThanOrEqual(3);
    expect(tries.length).toBeLessThanOrEqual(5);
    const gaps = tries.slice(1).map((at, i) => at - (tries[i] ?? 0));
    expect(gaps[1] ?? 0).toBeGreaterThan(gaps[0] ?? 0);
    expect(seen.length).toBeGreaterThan(10);
    expect(seen.every((state) => state >= 100)).toBe(true);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("gives up on a try that never sends anything, while polling goes on", async () => {
    const trySignals: AbortSignal[] = [];
    let calls = 0;
    // biome-ignore lint/correctness/useYield: A stream that fails before sending anything
    const primary = transport(async function* ({ signal }) {
      calls++;
      if (calls === 1) throw new Error("Outage");
      trySignals.push(signal);
      await waitForAbort(signal);
    });
    const fallback = createFallbackTransport(primary, polling(), {
      retryPrimary: { initialDelayMs: 10, maxDelayMs: 1_000, timeoutMs: 30 },
    });
    const controller = new AbortController();
    const seen = await take(
      fallback.subscribe({ id: "a", signal: controller.signal }),
      controller,
      (states) => states.length >= 15,
    );

    expect(seen.every((state) => state >= 100)).toBe(true);
    expect(trySignals.length).toBeGreaterThanOrEqual(1);
    expect(trySignals[0]?.aborted).toBe(true);
  });

  it("stays on the secondary without retryPrimary, as before", async () => {
    let calls = 0;
    // biome-ignore lint/correctness/useYield: A stream that fails before sending anything
    const primary = transport(async function* () {
      calls++;
      throw new Error("Outage");
    });
    const fallback = createFallbackTransport(primary, polling());
    const controller = new AbortController();
    const seen = await take(
      fallback.subscribe({ id: "a", signal: controller.signal }),
      controller,
      (states) => states.length >= 12,
    );
    expect(calls).toBe(1);
    expect(seen.length).toBe(12);
  });

  it("closes both sources when the subscriber stops during a try", async () => {
    const pollSignals: AbortSignal[] = [];
    const trySignals: AbortSignal[] = [];
    let calls = 0;
    // biome-ignore lint/correctness/useYield: A stream that fails before sending anything
    const primary = transport(async function* ({ signal }) {
      calls++;
      if (calls === 1) throw new Error("Outage");
      trySignals.push(signal);
      await waitForAbort(signal);
    });
    const fallback = createFallbackTransport(primary, polling(pollSignals), {
      retryPrimary: { initialDelayMs: 10, timeoutMs: 10_000 },
    });
    const controller = new AbortController();
    const events = fallback.subscribe({ id: "a", signal: controller.signal });
    const done = (async () => {
      for await (const _ of events) {
        // Reads until aborted
      }
    })();
    await sleep(40);
    expect(trySignals.length).toBe(1);
    controller.abort();
    await done;
    expect(trySignals[0]?.aborted).toBe(true);
    expect(pollSignals[0]?.aborted).toBe(true);
  });

  it("leaves errors from the secondary and from the restored stream to the session", async () => {
    const failingPoll = transport(async function* () {
      yield { type: "state", state: 100 };
      throw new Error("Polling failed");
    });
    // biome-ignore lint/correctness/useYield: A stream that fails before sending anything
    const down = transport(async function* () {
      throw new Error("Outage");
    });
    const controller = new AbortController();
    await expect(
      take(
        createFallbackTransport(down, failingPoll, {
          retryPrimary: fast,
        }).subscribe({
          id: "a",
          signal: controller.signal,
        }),
        controller,
        () => false,
      ),
    ).rejects.toThrow("Polling failed");

    let calls = 0;
    const flaky = transport(async function* () {
      calls++;
      if (calls === 1) throw new Error("Outage");
      yield { type: "state", state: 1 };
      throw new Error("Lost again");
    });
    const second = new AbortController();
    await expect(
      take(
        createFallbackTransport(flaky, polling(), {
          retryPrimary: fast,
        }).subscribe({
          id: "a",
          signal: second.signal,
        }),
        second,
        () => false,
      ),
    ).rejects.toThrow("Lost again");
  });

  it("tries again when the stream closes before sending anything", async () => {
    let calls = 0;
    const primary = transport(async function* ({ signal }) {
      calls++;
      if (calls === 1) throw new Error("Outage");
      if (calls === 2) return;
      yield { type: "state", state: 1 };
      await waitForAbort(signal);
    });
    const fallback = createFallbackTransport(primary, polling(), {
      retryPrimary: { initialDelayMs: 10, maxDelayMs: 20, timeoutMs: 100 },
    });
    const controller = new AbortController();
    const seen = await take(
      fallback.subscribe({ id: "a", signal: controller.signal }),
      controller,
      (states) => states.includes(1),
    );
    expect(calls).toBe(3);
    expect(seen.at(-1)).toBe(1);
  });
});

describe("fallback around a limited stream", () => {
  it("gives the stream slot back when the stream fails before sending anything", async () => {
    const limiter = createStreamLimiter({ maxStreams: 1 });
    // biome-ignore lint/correctness/useYield: A stream that fails before sending anything
    const down = transport(async function* () {
      throw new Error("Outage");
    });
    const fallback = createFallbackTransport(
      createLimitedTransport(down, polling(), { limiter }),
      polling(),
    );
    const controller = new AbortController();
    const seen = await (async () => {
      const states: number[] = [];
      for await (const event of fallback.subscribe({
        id: "a",
        signal: controller.signal,
      })) {
        if (event.type === "state") states.push(event.state);
        if (states.length === 1) {
          // Still polling, and another workflow can take the only stream
          const release = limiter.acquire();
          expect(release).toBeDefined();
          release?.();
          break;
        }
      }
      return states;
    })();
    controller.abort();
    expect(seen).toEqual([100]);
  });
});
