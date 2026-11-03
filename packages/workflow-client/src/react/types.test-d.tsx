// Checked by `pnpm typecheck`. A line that starts compiling fails on its directive.
import type { SignalDefinition, UpdateDefinition } from "@temporalio/client";

import { signal, update } from "../actions";
import {
  defineWorkflow,
  WorkflowClient,
  type WorkflowTransportOptions,
} from "../client";
import {
  defineServerActions,
  signalAction,
  updateAction,
} from "../server/actions";
import type { WorkflowTransport } from "../types";
import { useWorkflow } from "./useWorkflow";
import { useWorkflowAction } from "./useWorkflowAction";
import { useWorkflows } from "./useWorkflows";

type OrderState = { status: string };
type OrderInput = { items: string[] };
type OrderResult = { referenceId: string };
type PaymentState = { amount: number };

declare const orderTransport: WorkflowTransport<
  OrderState,
  OrderInput,
  OrderResult
>;
declare const paymentTransport: WorkflowTransport<PaymentState, number>;

const order = defineWorkflow({ type: "order", transport: orderTransport });
const payment = defineWorkflow({
  type: "payment",
  transport: paymentTransport,
});
const client = new WorkflowClient({ workflows: [order, payment] });

declare const approveSignal: SignalDefinition<[{ ok: boolean }]>;
declare const addItemUpdate: UpdateDefinition<
  { count: number },
  [{ item: string }]
>;
declare const pingSignal: SignalDefinition<[]>;

const contract = {
  approve: signal<{ ok: boolean }>(),
  addItem: update<{ item: string }, { count: number }>(),
  ping: signal(),
  total: update<void, number>(),
};
const withActions = defineWorkflow({
  type: "withActions",
  transport: orderTransport,
  isFinal: (state) => state.status === "x",
  onFinish: ({ state }) => state?.status,
  actions: contract,
});
const withContext = defineWorkflow({
  type: "withContext",
  transport: ({ context }: WorkflowTransportOptions<{ token: string }>) =>
    context.token ? orderTransport : orderTransport,
  isFinal: (state) => state.status === "x",
  lookup: async ({ context }) => ({ status: context.token }),
  onError: (_error, { state }, { remove }) => {
    if (state) remove();
  },
  actions: { addItem: update<string, number>() },
});
new WorkflowClient<{ token: string }>({
  workflows: [withContext, withActions, order],
  context: { token: "a" },
});
defineWorkflow<OrderState, OrderInput, OrderResult>({
  type: "x",
  transport: orderTransport,
  // @ts-expect-error Explicit generics can't infer actions, and shouldn't lose them
  actions: contract,
});

defineServerActions(contract, {
  approve: signalAction(approveSignal),
  addItem: updateAction(addItemUpdate),
  ping: signalAction(pingSignal),
  total: updateAction({} as UpdateDefinition<number, []>),
});
defineServerActions(
  { addItem: contract.addItem },
  // @ts-expect-error The frontend expects an update
  { addItem: signalAction(approveSignal) },
);
defineServerActions(
  { approve: contract.approve },
  // @ts-expect-error Another input than the declared one
  { approve: signalAction(pingSignal) },
);
defineServerActions(
  { total: contract.total },
  // @ts-expect-error Another result than the declared one
  { total: updateAction({} as UpdateDefinition<string, []>) },
);
declare const stricterSignal: SignalDefinition<
  [{ ok: boolean; extra: string }]
>;
declare const stricterUpdate: UpdateDefinition<
  { count: number },
  [{ item: string; extra: string }]
>;
declare const looserSignal: SignalDefinition<[{ ok?: boolean }]>;
defineServerActions(
  { approve: contract.approve },
  // @ts-expect-error The frontend can't send what this handler requires
  { approve: signalAction(stricterSignal) },
);
defineServerActions(
  { addItem: contract.addItem },
  // @ts-expect-error The frontend can't send what this handler requires
  { addItem: updateAction(stricterUpdate) },
);
defineServerActions(
  { approve: contract.approve },
  { approve: signalAction(looserSignal) },
);
// @ts-expect-error Every action needs an implementation
defineServerActions(contract, { ping: signalAction(pingSignal) });

export async function Actions() {
  const current = useWorkflow({ workflow: withActions, id: "a" });
  const state: string | undefined = current.state?.status;
  await current.actions.approve({ ok: true });
  await current.actions.ping();
  await current.actions.ping(undefined, { actionId: "a" });
  const total: number = await current.actions.total();
  const { count } = await current.actions.addItem(
    { item: "x" },
    { actionId: "retry" },
  );
  // @ts-expect-error The input of this action has an item
  await current.actions.addItem({ name: "x" });
  // @ts-expect-error This action needs an input
  await current.actions.approve();
  // @ts-expect-error This workflow doesn't have that action
  await current.actions.other();
  // @ts-expect-error A signal has no result
  (await current.actions.approve({ ok: true })).count;
  // @ts-expect-error This workflow has no actions
  await useWorkflow({ workflow: order, id: "a" }).actions.other();

  const add = useWorkflowAction({
    workflow: withActions,
    id: "a",
    action: "addItem",
  });
  const pending: boolean = add.isPending;
  const added: { count: number } | undefined = await add.send({ item: "x" });
  const lastResult: number | undefined = add.result?.count;
  // @ts-expect-error The input of this action has an item
  await add.send({ name: "x" });
  useWorkflowAction({
    workflow: withActions,
    id: "a",
    // @ts-expect-error This workflow doesn't have that action
    action: "other",
  });
  await useWorkflowAction({
    workflow: withActions,
    id: "a",
    action: "ping",
  }).send();

  const vanilla = await client
    .session(withActions, "a")
    .actions.addItem({ item: "x" });
  const fromClient: number = vanilla.count;
  const listed = client.list({ workflow: withActions })[0]?.state?.status;
  return [state, total, count, pending, added, lastResult, fromClient, listed];
}

export function Hooks() {
  const current = useWorkflow({ workflow: order, id: "a" });
  const status: string | undefined = current.state?.status;
  const reference: string | undefined = current.result?.referenceId;
  current.start({ items: [] });
  // @ts-expect-error The input of an order isn't a number
  current.start(1);
  // @ts-expect-error An order doesn't have an amount
  current.state?.amount;

  const orders = useWorkflows({ workflow: order });
  const first: string | undefined = orders[0]?.state?.status;
  // @ts-expect-error An order doesn't have an amount
  orders[0]?.state?.amount;

  const count: number = useWorkflows({
    workflow: payment,
    combine: (items) => items.filter((w) => (w.state?.amount ?? 0) > 0).length,
  });

  const all = useWorkflows();
  const type: string | undefined = all[0]?.type;
  // @ts-expect-error Every type is mixed here, so the state is unknown
  all[0]?.state?.status;

  return [status, reference, first, count, type];
}

export function Vanilla() {
  client.session(order, "a").start({ items: [] });
  // @ts-expect-error The input of an order isn't a number
  client.session(order, "a").start(1);
  const amount: number | undefined = client.list({ workflow: payment })[0]
    ?.state?.amount;
  const context = defineWorkflow<OrderState, OrderInput, OrderResult, string>({
    type: "x",
    transport: ({ context }) => {
      const token: string = context;
      return token ? orderTransport : orderTransport;
    },
  });
  // @ts-expect-error This workflow needs a string as its context
  new WorkflowClient<number>({ workflows: [context], context: 1 });
  new WorkflowClient<string>({ workflows: [context, order], context: "a" });
  return [amount, context];
}
