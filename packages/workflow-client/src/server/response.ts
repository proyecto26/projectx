import type { WorkflowEvent } from "../types";

export const WORKFLOW_STREAM_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache, no-transform",
  connection: "keep-alive",
  // Tells nginx not to hold the events back
  "x-accel-buffering": "no",
  "x-workflow-stream": "v1",
} as const;

export interface WorkflowStreamResponseInit {
  status?: number;
  headers?: Record<string, string>;
  /** Interval of the comments that keep idle connections open. */
  keepAliveMs?: number;
  /** Failures reading the events. The client reconnects when the stream closes. */
  onError?: (error: unknown) => void;
}

const encodeEvent = <TState>(event: WorkflowEvent<TState>) => {
  const offset =
    event.type !== "error" && event.offset !== undefined
      ? `id: ${event.offset}\n`
      : "";
  return `${offset}data: ${JSON.stringify(event)}\n\n`;
};

/**
 * Sends events as Server-Sent Events using a web standard `Response`, ready to
 * be returned from route handlers in Next.js, React Router, Hono and others.
 */
export function toWorkflowStreamResponse<TState>(
  events: AsyncIterable<WorkflowEvent<TState>>,
  {
    status = 200,
    headers,
    keepAliveMs = 15_000,
    onError,
  }: WorkflowStreamResponseInit = {},
): Response {
  const encoder = new TextEncoder();
  const iterator = events[Symbol.asyncIterator]();
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const cleanUp = () => {
    closed = true;
    if (keepAlive) clearInterval(keepAlive);
  };

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      keepAlive = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, keepAliveMs);
      keepAlive.unref?.();
    },
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (closed) return;
        if (done) {
          cleanUp();
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(encodeEvent(value)));
      } catch (error) {
        if (closed) return;
        cleanUp();
        onError?.(error);
        // Details stay on the server. Closing makes the client reconnect.
        controller.close();
      }
    },
    cancel() {
      cleanUp();
      // A generator waiting on a slow read only returns after it, so don't wait
      void iterator.return?.()?.catch?.(() => undefined);
    },
  });

  return new Response(body, {
    status,
    headers: { ...WORKFLOW_STREAM_HEADERS, ...headers },
  });
}
