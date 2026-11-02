# @proyecto26/temporal-workflow-client

Connect any JavaScript app to [Temporal](https://temporal.io/) workflows running in your backend, with live updates and no Temporal code in the browser.

Temporal has no official package for the frontend, and its client needs a server. So each app ends up writing its own endpoints, polling loop, reconnection and storage. This package gives you those parts, following the design of [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) from the Vercel AI SDK: a store that knows nothing about your UI framework, a transport you can replace, a thin React hook and a helper for your server.

```text
Browser                               Your API                       Temporal
useWorkflow ─ WorkflowSession ─ SSE ─ toWorkflowStreamResponse ─ gRPC ─ Workflow
                                ╰ polling, if streaming isn't available
```

## Features ✨

- 🔌 **Works with any backend:** use the included transports or write your own.
- 📡 **Live state** with Server-Sent Events and [Temporal Workflow Streams](https://github.com/temporalio/sdk-typescript/tree/main/contrib/workflow-streams).
- 🛟 **Polling fallback** when a proxy or an older workflow can't stream.
- 🔁 **Reconnection** with backoff, resuming from the last position.
- 💾 **Survives reloads:** workflows are restored and followed again, without repeating `onFinish` for those already finished.
- 🔒 **Sends your tokens:** streams use `fetch`, because `EventSource` can't send an `Authorization` header.
- ⚛️ **React hooks** that are safe with SSR and Strict Mode. React is optional.
- 🪶 **No Temporal or Node.js code** in the browser entry points.

## Installation 📦

```bash
npm install @proyecto26/temporal-workflow-client
```

| Entry point | Runs in | Also needs |
|---|---|---|
| `@proyecto26/temporal-workflow-client` | Anywhere | Nothing |
| `@proyecto26/temporal-workflow-client/react` | Browser and SSR | `react` 18 or 19 |
| `@proyecto26/temporal-workflow-client/server` | Node.js 20.3+ | `@temporalio/client` and `@temporalio/workflow-streams` to read workflows |

## Quick start 🚀

### 1. Publish the state from your workflow

```ts
import { allHandlersFinished, condition, setHandler } from "@temporalio/workflow";
import { WorkflowStream } from "@temporalio/workflow-streams/workflow";

export async function orderWorkflow(input: OrderInput) {
  const stream = new WorkflowStream();
  const state = { status: "Pending" };
  const publishState = () => stream.topic("state").publish(state);
  setHandler(getStateQuery, () => state);

  try {
    await processPayment(input);
    state.status = "Confirmed";
    publishState();
  } finally {
    // Answer the waiting subscribers before the workflow closes
    stream.detachPollers();
    await condition(allHandlersFinished);
  }
}
```

> [!WARNING]
> A subscriber waiting for new items counts as a running update handler. Don't call `condition(allHandlersFinished)` in the middle of a workflow that has a stream unless you call `detachPollers()` first, or it waits until a new item is published.

### 2. Expose it from your API

The helper returns a standard `Response`, so it fits Next.js, React Router, Hono and other web frameworks:

```ts
// app/api/orders/[id]/stream/route.ts
import { toWorkflowStreamResponse, workflowStreamEvents } from "@proyecto26/temporal-workflow-client/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Check here that the user can see this workflow
  await assertOwner(request, id);

  return toWorkflowStreamResponse(
    workflowStreamEvents({
      client: temporalClient,
      workflowId: `order-${id}`,
      getState: (handle) => handle.query(getStateQuery),
      signal: request.signal,
    }),
  );
}
```

Use `pipeWorkflowResponse` with Express and NestJS:

```ts
import { pipeWorkflowResponse, toWorkflowStreamResponse, workflowStreamEvents } from "@proyecto26/temporal-workflow-client/server";

app.get("/orders/:id/stream", requireOwner, async (req, res) => {
  const controller = new AbortController();
  res.once("close", () => controller.abort());

  const response = toWorkflowStreamResponse(
    workflowStreamEvents({
      client: temporalClient,
      workflowId: `order-${req.params.id}`,
      getState: (handle) => handle.query(getStateQuery),
      signal: controller.signal,
    }),
  );
  await pipeWorkflowResponse(response, res);
});
```

> [!IMPORTANT]
> This package doesn't authenticate anyone. Check that the user owns the workflow **before** opening the stream, since it sends everything your query returns.

### 3. Use it from React

```tsx
import { createHttpStreamTransport } from "@proyecto26/temporal-workflow-client";
import { useWorkflow } from "@proyecto26/temporal-workflow-client/react";

const transport = createHttpStreamTransport<OrderState, OrderInput>({
  api: "/api/orders",
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

function Checkout({ id, input }: { id: string; input: OrderInput }) {
  const { status, state, error, start, cancel } = useWorkflow<OrderState, OrderInput>({
    id,
    transport,
    isFinal: ({ status }) => status === "Confirmed" || status === "Failed",
    onFinish: ({ state }) => console.log("Finished", state),
  });

  if (error) return <p>{error.message}</p>;
  if (status === "idle") return <button onClick={() => start(input)}>Pay</button>;
  return (
    <>
      <p>{state?.status ?? "Starting…"}</p>
      <button onClick={cancel}>Cancel</button>
    </>
  );
}
```

By default the transport uses `POST /api/orders` to start, `GET /api/orders/:id/stream` to read and `DELETE /api/orders/:id` to cancel, sending `{ id, input }` as the body. Change them with `startUrl`, `streamUrl`, `cancelUrl` and `body`.

## Keeping workflows across the app 🗂️

A component's workflow stops being followed when it unmounts. To follow workflows from anywhere, and restore them after a reload, use a registry with one instance per user:

```tsx
import { WorkflowRegistry } from "@proyecto26/temporal-workflow-client";
import { useWorkflow, useWorkflowList, WorkflowRegistryProvider } from "@proyecto26/temporal-workflow-client/react";

const registry = new WorkflowRegistry<OrderState, OrderInput>({
  transport,
  isFinal,
  storage: window.localStorage,
  storageKey: `orders:${user.email}`,
  ttlMs: 24 * 60 * 60 * 1000,
  onFinish: ({ state }) => toast(`Order ${state?.status}`),
});

<WorkflowRegistryProvider registry={registry}>
  <App />
</WorkflowRegistryProvider>;

// In any component below the provider
const order = useWorkflow<OrderState, OrderInput>({ id });
const orders = useWorkflowList<OrderState, OrderInput>();
```

The provider calls `registry.hydrate()` after the first render, so server and client render the same HTML. Effects in child components run before that, so check `registry.isHydrated` before starting a workflow that could already be stored.

> [!NOTE]
> Everything `state` and `result` hold is written to `storage`. Leave out of them whatever shouldn't stay in the browser.

### Several workflows at once

A user can have many workflows running. `useWorkflows` reads them like `useQueries`, and each one keeps its own connection or polling:

```tsx
const { pending, allFinished } = useWorkflows<OrderState, OrderInput, OrderResult, Summary>({
  ids: orderIds, // Optional, all the workflows of the registry by default
  combine, // Keep it stable with useCallback or out of the component
});
```

Use one registry per workflow type, each with its own transport, so workflows without streams can simply poll.

### Registry options

| Option | What it does |
|--------|--------------|
| `removeOnFinish` | Forgets a workflow after `onFinish`, so it isn't stored anymore. Components showing it keep their state until they unmount. |
| `lookup` | Reads a workflow from your backend. Needed by `registry.find(id)`, which restores a workflow that isn't here without firing `onFinish`, and answers `"missing"` on a 404. |
| `resolveId` | Reads the id decided by the backend from the start response. The session moves to that id and the requested one keeps working. Two sessions are never merged: if another one already has that id, the session fails. |
| `ttlMs` | Removes workflows without changes for this long, 24 hours by default, also while the app stays open. |

A workflow rejected by the backend when starting is removed from the registry, and the component that started it keeps the error. The backend decides what is allowed, so this package doesn't interpret status codes such as a 409.

> [!IMPORTANT]
> With `removeOnFinish`, this browser forgets finished workflows. Call `registry.find(id)` before starting one again from a URL that can be reloaded, and reject repeated ids in your backend, for example with `WorkflowIdReusePolicy.REJECT_DUPLICATE`.

## Without React ⚙️

```ts
import { createHttpStreamTransport, WorkflowSession } from "@proyecto26/temporal-workflow-client";

const session = new WorkflowSession({ id: "order-1", transport, isFinal });

const unsubscribe = session.subscribe(() => {
  const { status, state } = session.getSnapshot();
  render(status, state);
});

await session.start(input);
```

## Transports 🚚

| Transport | Use it when |
|---|---|
| `createHttpStreamTransport` | Your server uses `toWorkflowStreamResponse` |
| `createPollingTransport` | You only have an endpoint returning the state |
| `createFallbackTransport` | You want to stream, and poll if the stream fails before sending anything |

```ts
const stream = createHttpStreamTransport<OrderState, OrderInput>({ api: "/api/orders" });
const polling = createPollingTransport<OrderState, OrderInput>({
  start: stream.start,
  cancel: stream.cancel,
  getState: ({ id, signal }) => fetchOrderStatus(id, signal),
  intervalMs: 3000,
});
const transport = createFallbackTransport(stream, polling);
```

Or implement `WorkflowTransport` to use WebSockets or your own API client:

```ts
interface WorkflowTransport<TState, TInput, TResult = TState> {
  start(options: { id: string; input: TInput; signal: AbortSignal }): Promise<TResult>;
  subscribe(options: { id: string; fromOffset?: number; signal: AbortSignal }): AsyncIterable<WorkflowEvent<TState>>;
  cancel(options: { id: string; signal?: AbortSignal }): Promise<void>;
}
```

### Many workflows with streams

Each open stream holds a browser connection. Over HTTP/1.1 browsers allow about 6 per origin, so 6 streams leave every other request to that API waiting. `createLimitedTransport` follows the workflows above the limit with polling, and moves them to a stream when one ends:

```ts
const transport = createLimitedTransport(
  createFallbackTransport(stream, polling),
  polling,
  { maxStreams: 4 }, // The default
);
```

The limit counts one registry, so several tabs or registries using the same API share those connections. Serving the API over HTTP/2 removes this limit.

## API 📖

### `WorkflowSession` and `useWorkflow`

Both expose the same values:

| Value | Description |
|---|---|
| `status` | `idle`, `starting`, `running`, `finished` or `error` |
| `state` | Last state of the workflow |
| `result` | What `transport.start` returned |
| `error` | Why the session stopped |
| `isCancelling` | A cancellation was requested and the workflow hasn't finished |
| `executionStatus` | How the execution closed, such as `COMPLETED` or `FAILED` |
| `offset` | Position to resume from |
| `start(input)` | Starts and follows. It never starts a second workflow for the same session |
| `resume()` | Follows a workflow already running |
| `cancel()` | Requests the cancellation and keeps following until it ends |
| `stop()` | Stops listening. The workflow keeps running |
| `clearError()` | Clears the error |

`useWorkflow` also returns `isActive`, and accepts `resume: true` to follow a running workflow on mount.

Options: `id`, `transport`, `isFinal`, `reconnect`, `onState`, `onFinish`, `onError`.

`reconnect` accepts `initialDelayMs` (1 second), `maxDelayMs` (30 seconds), `maxAttempts` (unlimited) and `isFatal`. By default 4xx responses are fatal, except 408 and 429.

### `@proyecto26/temporal-workflow-client/server`

| Function | Description |
|---|---|
| `workflowStreamEvents(options)` | Events of a workflow: a snapshot, what it publishes, and a final `finish` event. Running workflows without a stream are followed with queries |
| `queryPollingEvents(options)` | Events from querying a workflow, which needs nothing from the workflow |
| `toWorkflowStreamResponse(events, init)` | Sends any events as Server-Sent Events, with keep-alive |
| `pipeWorkflowResponse(response, res)` | Writes a `Response` to a Node.js response |

With `getState`, each published item is treated as a full state and a new connection gets the current one. Without it, connections read the log from `fromOffset`, which suits topics that publish deltas.

The stream always ends by reading the state again, because an item published right before a workflow closes can be missed.

## Requirements 📋

- Temporal TypeScript SDK 1.25 or later. `@temporalio/workflow-streams` is in Public Preview, so its API may change.
- Node.js 20.3 or later on the server.

## Sponsors 💜

This project is free and open source. Sponsors help keep it maintained and growing.

[**Become a Sponsor**](https://github.com/sponsors/proyecto26) | [Sponsorship Program](https://proyecto26.com/sponsors/)

## Contribution 🤝

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.
 
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated** ❤️.
 
You can learn more about how you can contribute to this project in the [contribution guide](https://github.com/proyecto26/.github/blob/master/CONTRIBUTING.md).

## License ⚖️
This repository is available under the [MIT License](./LICENSE).

## Happy vibe coding 💯

Made with ❤️ by [Proyecto 26](https://proyecto26.com)

<pre role="img" aria-label="ASCII Made with Temporal">
╔╦╗╔═╗╔╦╗╔═╗╔═╗╦═╗╔═╗╦   <img width="150px" src="https://avatars0.githubusercontent.com/u/28855608?s=200&v=4" align="right">
 ║ ║╣ ║║║╠═╝║ ║╠╦╝╠═╣║  
 ╩ ╚═╝╩ ╩╩  ╚═╝╩╚═╩ ╩╩═╝⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
</pre>


