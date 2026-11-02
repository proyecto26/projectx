// Checked by `pnpm typecheck`. A line that starts compiling fails on its directive.
import { defineWorkflow, WorkflowClient } from "../client";
import type { WorkflowTransport } from "../types";
import { useWorkflow } from "./useWorkflow";
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
