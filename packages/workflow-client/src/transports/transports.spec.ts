import { describe, expect, it, vi } from "vitest";

import { toWorkflowStreamResponse } from "../server/response";
import { parseSse } from "../sse";
import type { WorkflowEvent, WorkflowTransport } from "../types";
import { createFallbackTransport } from "./fallback";
import { createHttpStreamTransport } from "./http-stream";
import { createPollingTransport } from "./polling";

const encoder = new TextEncoder();
const chunks = (...parts: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });

const collect = async <T>(items: AsyncIterable<T>) => {
  const result: T[] = [];
  for await (const item of items) result.push(item);
  return result;
};

const signal = () => new AbortController().signal;

describe("parseSse", () => {
  it("handles chunk boundaries, CRLF, comments and multiline data", async () => {
    const messages = await collect(
      parseSse(
        chunks(
          ": ping\n\nid: 1\nda",
          "ta: a\ndata: b\n\n",
          "event: x\r\ndata: c\r",
          "\n\r\n",
          "data: never finished",
        ),
      ),
    );
    expect(messages).toEqual([
      { id: "1", data: "a\nb" },
      { event: "x", data: "c" },
    ]);
  });
});

describe("http stream transport with the server response", () => {
  const events: WorkflowEvent<{ n: number }>[] = [
    { type: "state", state: { n: 1 }, offset: 1 },
    { type: "state", state: { n: 2 }, offset: 2 },
    { type: "finish", state: { n: 3 }, status: "COMPLETED", offset: 3 },
  ];

  it("round trips events, sending headers and the offset", async () => {
    const fetchMock = vi.fn(async () =>
      toWorkflowStreamResponse(
        (async function* () {
          yield* events;
        })(),
      ),
    );
    const transport = createHttpStreamTransport<{ n: number }>({
      api: "https://api.test/orders",
      headers: () => ({ authorization: "Bearer token" }),
      fetch: fetchMock as unknown as typeof fetch,
    });

    const received = await collect(
      transport.subscribe({ id: "a/b", fromOffset: 2, signal: signal() }),
    );

    expect(received).toEqual(events);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.test/orders/a%2Fb/stream?fromOffset=2");
    expect(init.headers).toMatchObject({ authorization: "Bearer token" });
  });

  it("sets the streaming headers and the event id", async () => {
    const response = toWorkflowStreamResponse(
      (async function* () {
        yield* events.slice(0, 1);
      })(),
    );
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("x-accel-buffering")).toBe("no");
    expect(await response.text()).toBe(
      `id: 1\ndata: ${JSON.stringify(events[0])}\n\n`,
    );
  });

  it("closes without leaking server errors", async () => {
    const onError = vi.fn();
    const response = toWorkflowStreamResponse(
      (async function* (): AsyncGenerator<WorkflowEvent<number>> {
        yield { type: "state", state: 1 };
        throw new Error("secret detail");
      })(),
      { onError },
    );
    const text = await response.text();
    expect(text).not.toContain("secret detail");
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("sends keep-alive comments and stops reading on cancel", async () => {
    const returned = vi.fn();
    const response = toWorkflowStreamResponse(
      (async function* (): AsyncGenerator<WorkflowEvent<number>> {
        try {
          yield { type: "state", state: 1 };
          await new Promise((resolve) => setTimeout(resolve, 30));
          yield { type: "state", state: 2 };
        } finally {
          returned();
        }
      })(),
      { keepAliveMs: 5 },
    );
    const reader = response.body?.getReader();
    let text = "";
    while (!text.includes("keep-alive")) {
      const { value } = (await reader?.read()) ?? {};
      text += new TextDecoder().decode(value);
    }
    await reader?.cancel();
    await vi.waitFor(() => expect(returned).toHaveBeenCalled());
  });

  it("fails on error responses and on anything that isn't a stream", async () => {
    const respond = (response: Response) =>
      createHttpStreamTransport<number>({
        api: "/x",
        fetch: (async () => response) as unknown as typeof fetch,
      }).subscribe({ id: "a", signal: signal() });

    await expect(
      collect(respond(new Response("no", { status: 404 }))),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      collect(
        respond(
          new Response("<html>", { headers: { "content-type": "text/html" } }),
        ),
      ),
    ).rejects.toThrow("stream of events");
  });

  it("starts and cancels with custom urls and body", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ ok: true })),
    );
    const transport = createHttpStreamTransport<
      number,
      { a: number },
      { ok: boolean }
    >({
      startUrl: () => "/start",
      cancelUrl: (id) => `/cancel/${id}`,
      body: ({ input }) => input,
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(
      transport.start({ id: "x", input: { a: 1 }, signal: signal() }),
    ).resolves.toEqual({ ok: true });
    await transport.cancel({ id: "x" });

    const calls = fetchMock.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0]?.[0]).toBe("/start");
    expect(calls[0]?.[1].body).toBe('{"a":1}');
    expect(calls[1]?.[0]).toBe("/cancel/x");
    expect(calls[1]?.[1].method).toBe("DELETE");
  });
});

describe("polling transport", () => {
  it("only emits changes and stops when aborted", async () => {
    const controller = new AbortController();
    const states = [1, 1, 2];
    const getState = vi.fn(async () => {
      const state = states.shift();
      if (state === undefined) controller.abort();
      return state ?? 2;
    });
    const transport = createPollingTransport<number>({
      start: vi.fn(),
      cancel: vi.fn(),
      getState,
      intervalMs: 1,
    });

    const events: WorkflowEvent<number>[] = [];
    await expect(
      (async () => {
        for await (const event of transport.subscribe({
          id: "a",
          signal: controller.signal,
        })) {
          events.push(event);
        }
      })(),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(events).toEqual([
      { type: "state", state: 1 },
      { type: "state", state: 2 },
    ]);
  });
});

describe("fallback transport", () => {
  const from = (
    generator: () => AsyncGenerator<WorkflowEvent<number>>,
  ): WorkflowTransport<number> => ({
    start: vi.fn(),
    cancel: vi.fn(),
    subscribe: generator,
  });
  const secondary = from(async function* () {
    yield { type: "state", state: 2 };
  });

  it("uses the secondary if the primary fails before any event", async () => {
    const onFallback = vi.fn();
    const transport = createFallbackTransport(
      // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
      from(async function* () {
        throw new Error("No streaming here");
      }),
      secondary,
      { onFallback },
    );
    await expect(
      collect(transport.subscribe({ id: "a", signal: signal() })),
    ).resolves.toEqual([{ type: "state", state: 2 }]);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("leaves later failures and aborts to the session", async () => {
    const transport = createFallbackTransport(
      from(async function* () {
        yield { type: "state", state: 1 };
        throw new Error("Lost");
      }),
      secondary,
    );
    await expect(
      collect(transport.subscribe({ id: "a", signal: signal() })),
    ).rejects.toThrow("Lost");

    const controller = new AbortController();
    controller.abort();
    const aborted = createFallbackTransport(
      // biome-ignore lint/correctness/useYield: A stream that fails or waits without events
      from(async function* () {
        throw new DOMException("Aborted", "AbortError");
      }),
      secondary,
    );
    await expect(
      collect(aborted.subscribe({ id: "a", signal: controller.signal })),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
