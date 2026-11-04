import { parseSse } from "../sse";
import {
  WorkflowClientError,
  type WorkflowEvent,
  type WorkflowTransport,
} from "../types";
import { untilAborted } from "../utils";

/** Code of the error thrown when a stream goes idle. The session reconnects. */
export const STREAM_IDLE = "stream_idle";

type MaybePromise<T> = T | Promise<T>;
type Headers = Record<string, string>;

export interface HttpStreamTransportOptions<TInput> {
  /** Base URL: POST to start, GET `/:id/stream` to read, DELETE `/:id` to cancel. */
  api?: string;
  startUrl?: (id: string) => string;
  streamUrl?: (id: string) => string;
  cancelUrl?: (id: string) => string;
  /** Where actions go. Defaults to POST `/:id/actions/:action`. */
  actionUrl?: (id: string, action: string) => string;
  /** Called on every request, so tokens can change over time. */
  headers?: () => MaybePromise<Headers>;
  credentials?: RequestCredentials;
  /** Body of the start request. Defaults to `{ id, input }`. */
  body?: (options: { id: string; input: TInput }) => unknown;
  /** Body of an action. Defaults to `{ input, actionId }`. */
  actionBody?: (options: { input: unknown; actionId?: string }) => unknown;
  fetch?: typeof globalThis.fetch;
  /**
   * Fails a stream that sends nothing for this long, comments included, so the
   * session reconnects. It catches proxies that buffer and connections dropped
   * without closing. Keep it a few times the server's keep-alive, which is 15 s
   * with `toWorkflowStreamResponse`. 45 s by default, `0` to turn it off.
   */
  idleTimeoutMs?: number;
}

const DEFAULT_IDLE_TIMEOUT_MS = 45_000;

async function assertOk(response: Response) {
  if (response.ok) return;
  // Servers can explain themselves with `{ message, code }`
  const details: { message?: unknown; code?: unknown } = await response
    .json()
    .catch(() => ({}));
  throw new WorkflowClientError(
    typeof details?.message === "string"
      ? details.message
      : `The request failed with status ${response.status}`,
    {
      status: response.status,
      code: typeof details?.code === "string" ? details.code : undefined,
    },
  );
}

/**
 * Talks to a server using `toWorkflowStreamResponse`. It reads the events with
 * `fetch` because `EventSource` can't send an Authorization header.
 */
export function createHttpStreamTransport<
  TState,
  TInput = unknown,
  TResult = TState,
>(
  options: HttpStreamTransportOptions<TInput>,
): WorkflowTransport<TState, TInput, TResult> {
  const { api = "", credentials } = options;
  const idleTimeoutMs =
    options.idleTimeoutMs !== undefined &&
    Number.isFinite(options.idleTimeoutMs) &&
    options.idleTimeoutMs >= 0
      ? options.idleTimeoutMs
      : DEFAULT_IDLE_TIMEOUT_MS;
  const {
    startUrl = () => api,
    streamUrl = (id: string) => `${api}/${encodeURIComponent(id)}/stream`,
    cancelUrl = (id: string) => `${api}/${encodeURIComponent(id)}`,
    actionUrl = (id: string, action: string) =>
      `${api}/${encodeURIComponent(id)}/actions/${encodeURIComponent(action)}`,
    body = ({ id, input }: { id: string; input: TInput }) => ({ id, input }),
    actionBody = ({
      input,
      actionId,
    }: {
      input: unknown;
      actionId?: string;
    }) => ({
      input,
      actionId,
    }),
  } = options;
  // Looked up late to work with polyfills and test doubles
  const request: typeof globalThis.fetch = (...args) =>
    (options.fetch ?? globalThis.fetch)(...args);
  const getHeaders = async () => (await options.headers?.()) ?? {};

  return {
    async start({ id, input, signal }) {
      const response = await request(startUrl(id), {
        method: "POST",
        credentials,
        signal,
        headers: {
          "content-type": "application/json",
          ...(await getHeaders()),
        },
        body: JSON.stringify(body({ id, input })),
      });
      await assertOk(response);
      return (await response.json()) as TResult;
    },

    async cancel({ id, signal }) {
      const response = await request(cancelUrl(id), {
        method: "DELETE",
        credentials,
        signal,
        headers: await getHeaders(),
      });
      await assertOk(response);
    },

    async send({ id, action, input, actionId, signal }) {
      const response = await request(actionUrl(id, action), {
        method: "POST",
        credentials,
        signal,
        headers: {
          "content-type": "application/json",
          ...(await getHeaders()),
        },
        body: JSON.stringify(actionBody({ input, actionId })),
      });
      await assertOk(response);
      // A signal has nothing to answer
      const text = await response.text();
      return text ? JSON.parse(text) : undefined;
    },

    async *subscribe({ id, fromOffset, signal }) {
      const url = streamUrl(id);
      const separator = url.includes("?") ? "&" : "?";
      // Its own signal, so going idle can close the request
      const controller = new AbortController();
      const abort = () => controller.abort(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      let isIdle = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const touch = () => {
        if (!idleTimeoutMs) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          isIdle = true;
          controller.abort();
        }, idleTimeoutMs);
      };
      touch();
      try {
        // A token refresh that hangs counts against the timeout too
        const headers = await untilAborted(getHeaders(), controller.signal);
        const response = await request(
          fromOffset === undefined
            ? url
            : `${url}${separator}fromOffset=${fromOffset}`,
          {
            credentials,
            signal: controller.signal,
            headers: { accept: "text/event-stream", ...headers },
          },
        );
        await assertOk(response);
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.body || !contentType.includes("text/event-stream")) {
          throw new WorkflowClientError(
            "The server did not answer with a stream of events",
          );
        }
        for await (const message of parseSse(response.body, {
          onChunk: touch,
        })) {
          const event = JSON.parse(message.data) as WorkflowEvent<TState>;
          // Waiting for the reader isn't the stream being idle
          clearTimeout(timer);
          yield event;
          touch();
        }
      } catch (error) {
        if (isIdle && !signal.aborted) {
          throw new WorkflowClientError(
            `The stream sent nothing for ${idleTimeoutMs} ms`,
            { code: STREAM_IDLE, cause: error },
          );
        }
        throw error;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
  };
}
