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
- [Send signals and updates](#send-signals-and-updates-)
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

## Send signals and updates ✉️

Tell a running workflow something through your own endpoints. Declare the actions as an object, and each key becomes a function.

### 1. Declare the actions

Keep the object in a module both your frontend and backend can import, without anything from either of them:

```ts
import { signal, update } from "@proyecto26/temporal-workflow-client";

export const orderActions = {
  // Resolves once Temporal accepts it, without waiting for the workflow to process it
  approve: signal<{ approved: boolean }>(),
  // Resolves with what the workflow answers
  addItem: update<{ item: string }, { count: number }>(),
  // Called without arguments
  ping: signal(),
};
```

Then add it to the definition:

```ts
export const orderWorkflow = defineWorkflow({
  type: "order",
  transport, // A typed transport brings the types of the state, input and result
  isFinal: (state) => state.status === "Done",
  actions: orderActions,
});
```

> [!IMPORTANT]
> TypeScript can't infer some generics while you write others, so `defineWorkflow<State, Input, Result>({ actions })` doesn't compile: `Type '...' is not assignable to type 'undefined'`. Remove the generics and let the types come from the transport. If your transport is a function, annotate its parameter: `({ context }: WorkflowTransportOptions<MyContext>) => createHttpStreamTransport<State, Input, Result>({ ... })`.

### 2. Call them

```tsx
import { useWorkflow, useWorkflowAction } from "@proyecto26/temporal-workflow-client/react";

function Order({ id }: { id: string }) {
  // Tracks its last call. Failures go to `add.error`, so it's safe in an event handler
  const add = useWorkflowAction({ workflow: orderWorkflow, id, action: "addItem" });
  // These reject if the backend refuses, for you to handle
  const order = useWorkflow({ workflow: orderWorkflow, id });

  return (
    <>
      <button disabled={add.isPending} onClick={() => add.send({ item: "book" })}>
        Add
      </button>
      {add.error && <p>{add.error.message}</p>}

      <button onClick={() => order.actions.approve({ approved: true }).catch(showError)}>
        Approve
      </button>
    </>
  );
}
```

Without React, use the session: `await client.session(orderWorkflow, id).actions.addItem({ item })`. A session you create yourself takes the same `actions` option.

- **A rejected action doesn't break the workflow you're following.** The call fails, while `status` and `error` stay as they were, because the workflow is still running.
- **New state arrives by following the workflow,** with polling up to `intervalMs` later. What an update returns only goes to the caller.
- **Leaving the page doesn't cancel an action already sent.** Pass `{ signal }` as the last argument to stop waiting, knowing the backend may already have received it.
- **There are no automatic retries.** A signal can run twice if you repeat it, so make its handler safe to repeat.

To retry an update safely, pass the same `{ actionId }` with the same input. Temporal runs it once and returns the first result, but only within the same workflow run: this doesn't hold across `continueAsNew` or a new workflow with the same id.

### 3. Implement them in your API

The HTTP transport sends `POST /api/orders/:id/actions/:action` with `{ input, actionId }`. Change them with `actionUrl` and `actionBody`. With polling, give `createPollingTransport` a `send` option.

```ts
import {
  defineServerActions,
  pipeWorkflowResponse,
  signalAction,
  updateAction,
} from "@proyecto26/temporal-workflow-client/server";

// Doesn't compile if a name is missing, or if a kind, input or result doesn't match
const orderServerActions = defineServerActions(orderActions, {
  approve: signalAction(approveSignal),
  addItem: updateAction(addItemUpdate),
  ping: signalAction(pingSignal),
});

@Post(":id/actions/:action")
async send(
  @Param("id") id: string,
  @Param("action") action: string,
  @Body() body: { input?: unknown; actionId?: string },
  @Res() res: ServerResponse,
) {
  // Your check that this user owns the workflow
  const handle = await this.orders.getOwnedWorkflowHandle(id);
  const response = await orderServerActions.handle({ handle, name: action, ...body });
  await pipeWorkflowResponse(response, res);
}
```

Only the names in that object reach Temporal, and it also throws when created if they don't match, which covers JavaScript.

> [!WARNING]
> `input` comes from the browser, so validate it, and check first that the user owns the workflow. `handle` does neither.

| Status | When | The error has |
|---|---|---|
| 202 | Temporal accepted the signal, or the update returned nothing | |
| 200 | The update returned a value | |
| 404 | The action isn't listed, or the workflow doesn't exist or has closed | `code`: `unknown_action` or `not_found` |
| 422 | The update's validator or handler rejected it | `code`: `rejected` |
| 504 | Temporal didn't answer in time. The action may still run, so retry with the same `actionId` | `code`: `outcome_unknown` |

The message of an `ApplicationFailure` and of a validator's error reach the browser, so keep them safe to show. Other failures are thrown for your framework to handle. Without this helper, any endpoint works: answer `{ message, code }` when rejecting and the transport puts them on `WorkflowClientError`.

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
    // Polls if the stream fails before sending anything, such as behind a proxy
    return createFallbackTransport(
      // Polls above the limit of streams of the client, see below
      createLimitedTransport(stream, polling, { limiter }),
      polling,
      // While polling, tries the stream again: after 30 s, then waiting twice as long each time, up to 5 min
      { retryPrimary: true },
    );
  },
});
```

Keep the limit inside the fallback: a stream that fails then gives its slot back while it polls.

`retryPrimary` is off by default, so a stream that fails before its first event polls until the session reconnects, for example after a polling error or a reload. With it, polling goes on while each try runs, and the transport moves back to the stream on its first event. A try that sends nothing within `timeoutMs`, 10 s by default, counts as failed, so the stream should start with an event, such as the snapshot from `getState`. Tune it with `{ initialDelayMs, maxDelayMs, timeoutMs }`.

The stream transport also fails a stream that sends nothing for `idleTimeoutMs`, 45 s by default, so the session reconnects from the last offset. Keep-alive comments count, and `toWorkflowStreamResponse` sends one every 15 s, so a custom server must send something more often than the timeout. This catches connections dropped without closing. Behind a proxy that passes the first event and then buffers the rest, each connection still brings a fresh snapshot, so the state updates about once per timeout instead of hanging. Fix the proxy (`x-accel-buffering: no` is sent for nginx), or set `idleTimeoutMs: 0` to turn the check off. `retryPrimary.timeoutMs` is separate: it limits the wait for the first event of a try.

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
| `useWorkflowAction(options)` | Sending one action, with its pending state, result and error | `{ workflow, id, action, client? }`, where `action` is a key of `actions` |
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
| `actions.name(input, { signal, actionId }?)` | One function for each declared action. Rejects if the backend refuses it, without changing `status` |
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
| `actions` | What the browser can ask the workflow to do, declared with `signal` and `update` |
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
| `createFallbackTransport` | You want to stream, and poll if the stream fails before sending anything, trying the stream again with `retryPrimary` |
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
| `defineServerActions(contract, actions)` | Implements the declared actions. Its `handle` runs one and answers with a `Response` |
| `signalAction(definition)`, `updateAction(definition)` | Run a signal or an update defined with `defineSignal` or `defineUpdate` |

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


