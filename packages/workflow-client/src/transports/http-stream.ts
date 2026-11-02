import { parseSse } from "../sse";
import {
  WorkflowClientError,
  type WorkflowEvent,
  type WorkflowTransport,
} from "../types";

type MaybePromise<T> = T | Promise<T>;
type Headers = Record<string, string>;

export interface HttpStreamTransportOptions<TInput> {
  /** Base URL: POST to start, GET `/:id/stream` to read, DELETE `/:id` to cancel. */
  api?: string;
  startUrl?: (id: string) => string;
  streamUrl?: (id: string) => string;
  cancelUrl?: (id: string) => string;
  /** Called on every request, so tokens can change over time. */
  headers?: () => MaybePromise<Headers>;
  credentials?: RequestCredentials;
  /** Body of the start request. Defaults to `{ id, input }`. */
  body?: (options: { id: string; input: TInput }) => unknown;
  fetch?: typeof globalThis.fetch;
}

async function assertOk(response: Response) {
  if (response.ok) return;
  throw new WorkflowClientError(
    `The request failed with status ${response.status}`,
    { status: response.status },
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
  const {
    startUrl = () => api,
    streamUrl = (id: string) => `${api}/${encodeURIComponent(id)}/stream`,
    cancelUrl = (id: string) => `${api}/${encodeURIComponent(id)}`,
    body = ({ id, input }: { id: string; input: TInput }) => ({ id, input }),
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

    async *subscribe({ id, fromOffset, signal }) {
      const url = streamUrl(id);
      const separator = url.includes("?") ? "&" : "?";
      const response = await request(
        fromOffset === undefined
          ? url
          : `${url}${separator}fromOffset=${fromOffset}`,
        {
          credentials,
          signal,
          headers: { accept: "text/event-stream", ...(await getHeaders()) },
        },
      );
      await assertOk(response);
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.body || !contentType.includes("text/event-stream")) {
        throw new WorkflowClientError(
          "The server did not answer with a stream of events",
        );
      }
      for await (const message of parseSse(response.body)) {
        yield JSON.parse(message.data) as WorkflowEvent<TState>;
      }
    },
  };
}
