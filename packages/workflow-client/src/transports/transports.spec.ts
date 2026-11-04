import { describe, expect, it, vi } from "vitest";

import { toWorkflowStreamResponse } from "../server/response";
import { parseSse } from "../sse";
import {
  WorkflowClientError,
  type WorkflowEvent,
  type WorkflowSubscribeOptions,
  type WorkflowTransport,
} from "../types";
import { createFallbackTransport } from "./fallback";
import { createHttpStreamTransport, STREAM_IDLE } from "./http-stream";
import { createLimitedTransport } from "./limited";
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

describe("createLimitedTransport", () => {
  type State = { status: string };
  const waitForAbort = (signal: AbortSignal) =>
    new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () =>
        reject(new DOMException("Aborted", "AbortError")),
      );
    });
  const fake = (name: string, opened: string[]): WorkflowTransport<State> => ({
    start: vi.fn(async () => ({ status: name })),
    cancel: vi.fn(async () => undefined),
    // biome-ignore lint/correctness/useYield: A stream that waits without events
    async *subscribe({ id, signal }: WorkflowSubscribeOptions) {
      opened.push(`${name}:${id}`);
      await waitForAbort(signal);
    },
  });

  const follow = (
    transport: WorkflowTransport<State>,
    id: string,
    controller = new AbortController(),
  ) => ({
    controller,
    done: (async () => {
      for await (const _ of transport.subscribe({
        id,
        signal: controller.signal,
      })) {
        // Only the connections matter here
      }
    })().catch((error) => error),
  });

  it("uses the stream up to the limit and the secondary after it", async () => {
    const opened: string[] = [];
    const transport = createLimitedTransport(
      fake("stream", opened),
      fake("poll", opened),
      { maxStreams: 2 },
    );
    const all = ["a", "b", "c"].map((id) => follow(transport, id));
    await vi.waitFor(() => expect(opened).toHaveLength(3));
    expect(opened).toEqual(["stream:a", "stream:b", "poll:c"]);

    for (const { controller } of all) controller.abort();
    await Promise.all(all.map(({ done }) => done));
  });

  it("frees the streams right away when everything restarts, as Strict Mode does", async () => {
    const opened: string[] = [];
    const transport = createLimitedTransport(
      fake("stream", opened),
      fake("poll", opened),
      { maxStreams: 2 },
    );
    const ids = ["a", "b", "c", "d"];
    const first = ids.map((id) => follow(transport, id));
    await vi.waitFor(() => expect(opened).toHaveLength(4));
    opened.length = 0;

    for (const { controller } of first) controller.abort();
    const second = ids.map((id) => follow(transport, id));
    await vi.waitFor(() => expect(opened).toHaveLength(4));
    expect(opened).toEqual(["stream:a", "stream:b", "poll:c", "poll:d"]);

    for (const { controller } of second) controller.abort();
    await Promise.all([...first, ...second].map(({ done }) => done));
  });

  it("doesn't lose a free stream on a workflow that stopped waiting", async () => {
    const opened: string[] = [];
    const transport = createLimitedTransport(
      fake("stream", opened),
      fake("poll", opened),
      { maxStreams: 1 },
    );
    const streaming = follow(transport, "a");
    const stopped = follow(transport, "b");
    const waiting = follow(transport, "c");
    await vi.waitFor(() => expect(opened).toHaveLength(3));

    stopped.controller.abort();
    streaming.controller.abort();
    await expect(waiting.done).resolves.toBeUndefined();
    await Promise.all([stopped.done, streaming.done]);
  });

  it("ends the secondary without an error when a stream is free", async () => {
    const opened: string[] = [];
    const transport = createLimitedTransport(
      fake("stream", opened),
      fake("poll", opened),
      { maxStreams: 1 },
    );
    const first = follow(transport, "a");
    await vi.waitFor(() => expect(opened).toEqual(["stream:a"]));
    const second = follow(transport, "b");
    await vi.waitFor(() => expect(opened).toHaveLength(2));

    first.controller.abort();
    await first.done;
    // It ends by itself, so the session reconnects and takes the stream
    await expect(second.done).resolves.toBeUndefined();

    const reconnected = follow(transport, "b");
    await vi.waitFor(() => expect(opened.at(-1)).toBe("stream:b"));
    reconnected.controller.abort();
    await reconnected.done;
  });

  it("frees the stream when it fails and keeps the error", async () => {
    const opened: string[] = [];
    const failing = fake("stream", opened);
    // biome-ignore lint/correctness/useYield: A stream that fails without events
    failing.subscribe = async function* () {
      throw new Error("Down");
    };
    const transport = createLimitedTransport(failing, fake("poll", opened), {
      maxStreams: 1,
    });
    expect(await follow(transport, "a").done).toMatchObject({
      message: "Down",
    });
    // A second one takes the stream instead of the secondary
    expect(await follow(transport, "b").done).toMatchObject({
      message: "Down",
    });
    expect(opened).toEqual([]);
  });
});

describe("http stream transport idle timeout", () => {
  /** A stream response the test writes to, recording when the request is aborted. */
  const openStream = () => {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        controller = c;
      },
    });
    const requests: { signal: AbortSignal; url: string }[] = [];
    const fetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const requestSignal = init?.signal as AbortSignal;
        requests.push({ signal: requestSignal, url: String(url) });
        requestSignal.addEventListener("abort", () =>
          controller.error(new DOMException("Aborted", "AbortError")),
        );
        return new Response(body, {
          headers: { "content-type": "text/event-stream" },
        });
      },
    ) as unknown as typeof globalThis.fetch;
    const write = (text: string) => controller.enqueue(encoder.encode(text));
    return { fetch, write, requests };
  };
  const event = (state: number) =>
    `data: ${JSON.stringify({ type: "state", state })}\n\n`;

  it("fails a stream that goes silent, with a code the session retries", async () => {
    const { fetch, write, requests } = openStream();
    const transport = createHttpStreamTransport<number>({
      api: "/x",
      fetch,
      idleTimeoutMs: 40,
    });
    const seen: number[] = [];
    const reading = (async () => {
      for await (const e of transport.subscribe({
        id: "a",
        signal: signal(),
      })) {
        if (e.type === "state") seen.push(e.state);
      }
    })();
    write(event(1));
    const error = await reading.catch((e: unknown) => e);
    expect(seen).toEqual([1]);
    expect(error).toBeInstanceOf(WorkflowClientError);
    expect((error as WorkflowClientError).code).toBe(STREAM_IDLE);
    expect((error as WorkflowClientError).status).toBeUndefined();
    expect(requests[0]?.signal.aborted).toBe(true);
  });

  it("counts keep-alive comments and events as activity", async () => {
    const { fetch, write } = openStream();
    const transport = createHttpStreamTransport<number>({
      api: "/x",
      fetch,
      idleTimeoutMs: 40,
    });
    const controller = new AbortController();
    const seen: number[] = [];
    const reading = (async () => {
      for await (const e of transport.subscribe({
        id: "a",
        signal: controller.signal,
      })) {
        if (e.type === "state") seen.push(e.state);
      }
    })().catch((e: unknown) => e);
    write(event(1));
    for (let i = 0; i < 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      write(": keep-alive\n\n");
    }
    write(event(2));
    await new Promise((resolve) => setTimeout(resolve, 10));
    // Still open after 120 ms, three times the timeout
    expect(seen).toEqual([1, 2]);
    controller.abort();
    const error = await reading;
    expect((error as WorkflowClientError | undefined)?.code).not.toBe(
      STREAM_IDLE,
    );
  });

  it("doesn't count a slow reader as an idle stream", async () => {
    const { fetch, write } = openStream();
    const transport = createHttpStreamTransport<number>({
      api: "/x",
      fetch,
      idleTimeoutMs: 30,
    });
    const controller = new AbortController();
    const iterator = transport
      .subscribe({ id: "a", signal: controller.signal })
      [Symbol.asyncIterator]();
    write(event(1));
    write(event(2));
    expect(await iterator.next()).toMatchObject({ value: { state: 1 } });
    // The reader takes longer than the timeout before asking for more
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(await iterator.next()).toMatchObject({ value: { state: 2 } });
    controller.abort();
    await iterator.next().catch(() => undefined);
  });

  it("counts a header lookup that hangs as idle", async () => {
    const fetch = vi.fn();
    const transport = createHttpStreamTransport<number>({
      api: "/x",
      fetch: fetch as unknown as typeof globalThis.fetch,
      idleTimeoutMs: 30,
      headers: () => new Promise<Record<string, string>>(() => undefined),
    });
    const error = await collect(
      transport.subscribe({ id: "a", signal: signal() }),
    ).catch((e: unknown) => e);
    expect((error as WorkflowClientError).code).toBe(STREAM_IDLE);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("can be turned off, and an abort by the subscriber stays an abort", async () => {
    const { fetch, write } = openStream();
    const transport = createHttpStreamTransport<number>({
      api: "/x",
      fetch,
      idleTimeoutMs: 0,
    });
    const controller = new AbortController();
    const reading = (async () => {
      for await (const _ of transport.subscribe({
        id: "a",
        signal: controller.signal,
      })) {
        // Reads until aborted
      }
    })().catch((e: unknown) => e);
    write(event(1));
    await new Promise((resolve) => setTimeout(resolve, 60));
    controller.abort();
    const error = await reading;
    expect(error).not.toBeInstanceOf(WorkflowClientError);
  });
});
