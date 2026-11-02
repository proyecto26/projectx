# @proyecto26/temporal-workflow-client

Connect any JavaScript app to [Temporal](https://temporal.io/) workflows running in your backend, with no Temporal code in the browser.

Temporal has no official package for the frontend, and its client needs a server. So each app ends up writing its own endpoints, polling loop, reconnection and storage. This package gives you those parts, following the design of [`useChat`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat) from the Vercel AI SDK: a store that knows nothing about your UI framework, a transport you can replace, and thin React hooks. Unlike a chat, a user can have many workflows running at once.

Your workflows don't need anything special: if they answer a query, you can follow them. Add [Workflow Streams](#live-updates-with-workflow-streams-) only where you want updates as they happen.

```text
Browser                               Your API                  Temporal
useWorkflow ─ WorkflowSession ─ polling ─ your endpoint ─ query ─ Workflow
                                ╰ or SSE ─ toWorkflowStreamResponse ─ stream
```

## Contents

- [Features](#features-)
- [Installation](#installation-)
- [Quick start](#quick-start-)
- [Many workflows at once](#many-workflows-at-once-%EF%B8%8F)
- [Live updates with Workflow Streams](#live-updates-with-workflow-streams-)
- [Without React](#without-react-%EF%B8%8F)
- [API reference](#api-reference-)

## Features ✨

- 🔁 **Follow any workflow** by querying it, with no changes to the workflow.
- 🗂️ **Many workflows of many kinds:** `useWorkflows` reads them together, like `useQueries`, and filters by kind.
- 🔔 **Run your code when one ends,** such as a toast, then clear it from the store.
- 💾 **Survives reloads:** workflows are restored and followed again, without repeating `onFinish` for those already finished.
- 📡 **Optional live state** with Server-Sent Events and [Temporal Workflow Streams](https://github.com/temporalio/sdk-typescript/tree/main/contrib/workflow-streams), with a fallback to polling.
- 🔒 **Sends your tokens:** streams use `fetch`, because `EventSource` can't send an `Authorization` header.
- ⚛️ **React hooks** that are safe with SSR and Strict Mode. React is optional.
- 🔌 **Works with any backend:** use the included transports or write your own.
- 🪶 **No Temporal or Node.js code** in the browser entry points.

## Installation 📦

```bash
npm install @proyecto26/temporal-workflow-client
```

| Entry point | Runs in | Also needs |
|---|---|---|
| `@proyecto26/temporal-workflow-client` | Anywhere | Nothing |
| `@proyecto26/temporal-workflow-client/react` | Browser and SSR | `react` 18 or 19 |
| `@proyecto26/temporal-workflow-client/server` | Node.js 20.3+ | `@temporalio/client`, and `@temporalio/workflow-streams` only to read streams |

> [!NOTE]
> Install the optional dependencies only for what you use. Following workflows by polling only needs this package in the browser, and any way of answering a query in your API.

## Quick start 🚀

This follows a normal Temporal workflow, using a query and no streams.

### 1. Your workflow answers a query

```ts
import { defineQuery, setHandler } from "@temporalio/workflow";

export const getStateQuery = defineQuery<OrderState>("getState");

export async function orderWorkflow(input: OrderInput) {
  const state: OrderState = { status: "Pending" };
  setHandler(getStateQuery, () => state);

  await processPayment(input);
  state.status = "Confirmed";
}
```

### 2. Your API starts it and reads it

Use your framework as usual. The client only needs an endpoint that starts the workflow, one that returns its state, and one that cancels it:

```ts
app.post("/api/orders", requireUser, async (req, res) => {
  const handle = await temporalClient.workflow.start(orderWorkflow, {
    workflowId: `order-${req.body.id}`,
    taskQueue: config.temporal.taskQueue,
    args: [req.body.input],
  });
  res.status(201).json({ workflowId: handle.workflowId });
});

app.get("/api/orders/:id", requireOwner, async (req, res) => {
  const handle = temporalClient.workflow.getHandle(`order-${req.params.id}`);
  res.json(await handle.query(getStateQuery));
});

app.delete("/api/orders/:id", requireOwner, async (req, res) => {
  await temporalClient.workflow.getHandle(`order-${req.params.id}`).cancel();
  res.status(204).end();
});
```

> [!IMPORTANT]
> This package doesn't authenticate anyone, and it doesn't decide what is allowed. Check that the user owns the workflow in every endpoint, and reject what your business rules don't allow. Temporal's [`workflowIdReusePolicy`](https://docs.temporal.io/workflow-execution/workflowid-runid#workflow-id-reuse-policy) is the place to say whether an id can run again.

### 3. Follow it from React

```tsx
import { createPollingTransport, WorkflowClientError } from "@proyecto26/temporal-workflow-client";
import { useWorkflow } from "@proyecto26/temporal-workflow-client/react";

const request = async (url: string, init?: RequestInit) => {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new WorkflowClientError("The request failed", { status: response.status });
  }
  return response;
};

const transport = createPollingTransport<OrderState, OrderInput, unknown>({
  start: async ({ id, input, signal }) =>
    (
      await request("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, input }),
        signal,
      })
    ).json(),
  getState: async ({ id, signal }) =>
    (await request(`/api/orders/${encodeURIComponent(id)}`, { signal })).json(),
  cancel: async ({ id, signal }) => {
    await request(`/api/orders/${encodeURIComponent(id)}`, { method: "DELETE", signal });
  },
  intervalMs: 3000,
});

function Checkout({ id, input }: { id: string; input: OrderInput }) {
  const { status, state, error, start, cancel } = useWorkflow<OrderState, OrderInput, unknown>({
    id,
    transport,
    // Polling can't see an execution close, so without this it never stops
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

> [!TIP]
> Use a new id for each operation and the same id when retrying it, so two purchases are two workflows and a double click is one.

### When a workflow is final

`isFinal` tells the client when a workflow is over for your users, using your own states. It receives each new state, and when it returns `true` the client stops following the workflow, sets its status to `finished` and runs `onFinish`.

```ts
const isFinal = ({ status }: OrderState) =>
  status === "Confirmed" || status === "Failed" || status === "Cancelled";
```

- **With polling you need it.** Polling only reads your query, so it can't see an execution close, and it keeps asking until `isFinal` returns `true` or your endpoint answers with an error such as a 404.
- **With streams it's optional.** The stream sends a `finish` event when the execution closes. Use `isFinal` to end sooner, for example when an order is paid but the workflow still has work to do.

> [!IMPORTANT]
> Include your failure and cancellation states. If a workflow closes with a state `isFinal` doesn't cover, polling keeps asking for it.

## Many workflows at once 🗂️

A component's workflow stops being followed when it unmounts. To follow workflows from anywhere, restore them after a reload, and run several kinds at once, describe each kind with `defineWorkflow` and give them to one client per user:

```ts
import { defineWorkflow, WorkflowClient } from "@proyecto26/temporal-workflow-client";

// Plain data, usually at the top of a module
export const orderWorkflow = defineWorkflow<OrderState, OrderInput, unknown>({
  type: "order",
  transport,
  isFinal,
  onFinish: ({ state }) => toast(`Order ${state?.status}`),
  removeOnFinish: true,
});

const client = new WorkflowClient({
  workflows: [orderWorkflow, paymentWorkflow],
  storage: window.localStorage,
  storageKey: `workflows:${user.email}`,
});
```

The definition is what tells the kinds apart, and it brings its types with it. Each one has its own transport, so workflows without streams can simply poll, and its own `onFinish`.

> [!NOTE]
> Everything `state` and `result` hold is written to `storage`, with one key per type such as `workflows:ana@example.com:order`. Leave out of them whatever shouldn't stay in the browser.

### In React

```tsx
import {
  useWorkflow,
  useWorkflows,
  WorkflowClientProvider,
} from "@proyecto26/temporal-workflow-client/react";

<WorkflowClientProvider client={client}>
  <App />
</WorkflowClientProvider>;

// One workflow, from any component below the provider
const order = useWorkflow({ workflow: orderWorkflow, id });

// All the workflows of a kind, or the ones you ask for, like `useQueries`
const orders = useWorkflows({ workflow: orderWorkflow });
const some = useWorkflows({ workflow: orderWorkflow, ids });

// Every kind, each one with its `type`
const all = useWorkflows();
const running = all.filter(({ status }) => status === "running");
```

The provider calls `client.hydrate()` after the first render, so server and client render the same HTML. Effects in child components run before that, so check `client.isHydrated` before starting a workflow that could already be stored. `useWorkflowClient()` returns the client.

`combine` derives a value, and is what you want for a badge. Keep it stable with `useCallback` or out of the component:

```tsx
const countRunning = (workflows: ReadonlyArray<{ status: string }>) =>
  workflows.filter(({ status }) => status === "running").length;

function OrdersBadge() {
  const active = useWorkflows({ workflow: orderWorkflow, combine: countRunning });
  return active > 0 ? <span>{active} orders in progress</span> : null;
}
```

### In JavaScript, with or without React

Nothing changes but the generics. Without React, the client does the same:

```js
import { defineWorkflow, WorkflowClient } from "@proyecto26/temporal-workflow-client";

const orderWorkflow = defineWorkflow({ type: "order", transport, isFinal });
const client = new WorkflowClient({ workflows: [orderWorkflow] });

client.hydrate();
client.subscribe(() => render(client.list({ type: "order" })));
client.session(orderWorkflow, "order-1").start(input);
```

### When your transport needs the user

Definitions live in a module, and clients are per user. `transport` can be a function of what you give to the client as `context`, and `lookup` receives it too:

```ts
const orderWorkflow = defineWorkflow<OrderState, OrderInput, unknown, { getToken: () => string }>({
  type: "order",
  transport: ({ context }) =>
    createHttpStreamTransport({
      api: "/api/orders",
      headers: () => ({ Authorization: `Bearer ${context.getToken()}` }),
    }),
});

const client = new WorkflowClient({
  workflows: [orderWorkflow],
  context: { getToken },
});
```

### When a workflow ends

`onFinish` runs your code, and with `removeOnFinish` the workflow is then cleared from the store and from `storage`, so it's no longer followed. Components showing it keep their state until they unmount.

Because this browser forgets it, call `client.find(orderWorkflow, id)` before starting one again from a URL that can be reloaded. It asks your backend through the `lookup` option, and answers `"found"` or `"missing"` without repeating `onFinish`.

### When the backend rejects a workflow

A workflow rejected when starting is removed from the client, and the component that started it keeps the error. The package doesn't interpret status codes such as a 409, because your backend decides what is allowed.

To read the error from another view, such as after a redirect, set `removeOnReject: false`, and clear it when you're done:

```tsx
const { error, remove } = useWorkflow({ workflow: orderWorkflow, id });

useEffect(() => {
  if (error) showError(error);
  return () => {
    if (error) remove();
  };
}, [error, remove]);
```

It stays in memory until then or until `ttlMs`, and it's never written to `storage`.

## Live updates with Workflow Streams 📡

Polling is enough for many workflows. Add streams when a user is watching and waiting, or when a workflow publishes progress. You keep the same hooks and only change the transport.

```bash
npm install @temporalio/client @temporalio/workflow-streams
```

### 1. Publish from your workflow

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
> A subscriber waiting for new items counts as a running update handler. Don't call `condition(allHandlersFinished)` in the middle of a workflow that has a stream unless you call `detachPollers()` first, or it waits until a new item is published. Workflow Streams is in Public Preview, so its API can change.

> [!CAUTION]
> Adding a stream to a workflow changes its history. If executions are running when you deploy it, guard it with [`patched()`](https://docs.temporal.io/develop/typescript/versioning#patching) or they will fail on replay.

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

Running workflows that don't publish anything are followed with queries over the same connection, so one endpoint can serve both.

### 3. Change the transport

```ts
import {
  createFallbackTransport,
  createHttpStreamTransport,
  createLimitedTransport,
  defineWorkflow,
} from "@proyecto26/temporal-workflow-client";

export const orderWorkflow = defineWorkflow<OrderState, OrderInput, unknown>({
  type: "order",
  isFinal,
  transport: ({ limiter }) => {
    const stream = createHttpStreamTransport<OrderState, OrderInput, unknown>({
      api: "/api/orders",
      headers: () => ({ Authorization: `Bearer ${getToken()}` }),
    });
    return createLimitedTransport(
      // Polls if the stream fails before sending anything, such as behind a proxy
      createFallbackTransport(stream, polling),
      // Polls above the limit of streams of the client, see below
      polling,
      { limiter },
    );
  },
});
```

By default the stream transport uses `POST /api/orders` to start, `GET /api/orders/:id/stream` to read and `DELETE /api/orders/:id` to cancel, sending `{ id, input }` as the body. Change them with `startUrl`, `streamUrl`, `cancelUrl` and `body`.

> [!WARNING]
> Each open stream holds a browser connection. Over HTTP/1.1 browsers allow about 6 per origin, so 6 streams leave every other request to that API waiting. `createLimitedTransport` follows the workflows above the limit with polling, and moves them to a stream when one ends. `limiter` shares that limit between all the kinds of a client, set with `maxStreams`, 4 by default. Other tabs using the same API aren't counted. Serving the API over HTTP/2 removes this limit.

## Without React ⚙️

For one workflow, use a session directly:

```ts
import { WorkflowSession } from "@proyecto26/temporal-workflow-client";

const session = new WorkflowSession({ id: "order-1", transport, isFinal });

const unsubscribe = session.subscribe(() => {
  const { status, state } = session.getSnapshot();
  render(status, state);
});

await session.start(input);
```

For many, use [a client](#in-javascript-with-or-without-react).

## API reference 📖

### Hooks

Import them from `@proyecto26/temporal-workflow-client/react`.

| Hook | Use it for | Options |
|---|---|---|
| `useWorkflow(options)` | One workflow | `{ workflow, id, client? }`, `{ session }`, or `{ id, transport, ... }` for one tied to the component |
| `useWorkflows(options?)` | Several workflows and a derived value | `{ workflow, ids?, combine?, client? }`, or `{ type?, ids?, combine?, client? }` for every kind |
| `useWorkflowClient()` | The client of the provider | |

`useWorkflow` and `WorkflowSession` expose the same values:

| Value | Description |
|---|---|
| `status` | `idle`, `starting`, `running`, `finished` or `error` |
| `state` | Last state of the workflow |
| `result` | What `transport.start` returned |
| `error` | Why the session stopped |
| `isCancelling` | A cancellation was requested and the workflow hasn't finished |
| `executionStatus` | How the execution closed, such as `COMPLETED` or `FAILED`. Streams only |
| `offset` | Position to resume from. Streams only |
| `type` | The kind of workflow, when it comes from a client |
| `requestedId` | The id it was requested with, if the backend decided another |
| `start(input)` | Starts and follows. It never starts a second workflow for the same session |
| `resume()` | Follows a workflow already running |
| `cancel()` | Requests the cancellation and keeps following until it ends |
| `stop()` | Stops listening. The workflow keeps running |
| `clearError()` | Clears the error |
| `remove()` | `useWorkflow` only. Stops following it and forgets it. The workflow keeps running |

`useWorkflow` also returns `isActive`, and accepts `resume: true` to follow a running workflow on mount.

### `WorkflowSession`

Options: `id`, `transport`, `isFinal`, `reconnect`, `resolveId`, `onState`, `onFinish`, `onError`.

`reconnect` accepts `initialDelayMs` (1 second), `maxDelayMs` (30 seconds), `maxAttempts` (unlimited) and `isFatal`. By default 4xx responses are fatal, except 408 and 429.

### `defineWorkflow`

Options are those of `WorkflowSession`, except `id`, plus:

| Option | Description |
|---|---|
| `type` | Identifies this kind of workflow in the client |
| `transport` | A transport, or a function of `{ context, limiter }` that builds it |
| `ttlMs` | Removes workflows without changes for this long, 24 hours by default, also while the app stays open |
| `removeOnFinish` | Forgets a workflow after `onFinish` |
| `removeOnReject` | Forgets a workflow the backend rejected when starting. `true` by default |
| `lookup` | Reads a workflow from your backend, needed by `find`. Receives `{ id, signal, context }` |
| `resolveId` | Reads the id decided by the backend from the start response. The session moves to that id and the requested one keeps working. Two sessions are never merged: if another one already has that id, the session fails |
| `onError` | Also receives `{ remove }`, to forget this workflow |

### `WorkflowClient`

| Option | Description |
|---|---|
| `workflows` | Every kind of workflow, needed to restore the stored ones |
| `context` | What the definitions need from the app |
| `storage`, `storageKey` | Keep the workflows across reloads. Use one key per user |
| `maxStreams` | Streams open at once across all the kinds, 4 by default. Used through `limiter` |

| Method | Description |
|---|---|
| `session(workflow, id)` | The session of a workflow, creating it the first time |
| `has(workflow, id)` | Whether it's kept here |
| `find(workflow, id, { signal }?)` | Asks the backend for a workflow that isn't here. Answers `"found"` or `"missing"` |
| `remove(workflow, id)` | Stops following a workflow and forgets it. The workflow keeps running |
| `list({ workflow?, type?, predicate? }?)` | Snapshots of the workflows, each one with its `type` |
| `subscribe(listener)` | Runs when any of them changes |
| `hydrate()` | Restores stored workflows and follows the unfinished ones |
| `isHydrated` | Whether `hydrate` ran |
| `stop()` | Stops following all of them. `hydrate` follows them again |

### Transports

| Transport | Use it when |
|---|---|
| `createPollingTransport` | You only have an endpoint returning the state |
| `createHttpStreamTransport` | Your server uses `toWorkflowStreamResponse` |
| `createFallbackTransport` | You want to stream, and poll if the stream fails before sending anything |
| `createLimitedTransport` | You can have more workflows than connections to spare |
| `createStreamLimiter` | You want to share that limit without a client |

Or implement `WorkflowTransport` to use WebSockets or your own API client:

```ts
interface WorkflowTransport<TState, TInput, TResult = TState> {
  start(options: { id: string; input: TInput; signal: AbortSignal }): Promise<TResult>;
  subscribe(options: { id: string; fromOffset?: number; signal: AbortSignal }): AsyncIterable<WorkflowEvent<TState>>;
  cancel(options: { id: string; signal?: AbortSignal }): Promise<void>;
}
```

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


