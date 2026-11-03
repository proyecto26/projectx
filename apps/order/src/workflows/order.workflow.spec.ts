const handlers = new Map<string, (...args: unknown[]) => unknown>();
const childSignal = jest.fn();
let finishStart: () => void = () => undefined;

jest.mock("@temporalio/workflow", () => ({
  ApplicationFailure: {
    nonRetryable: (message: string) => new Error(message),
  },
  defineSignal: (name: string) => ({ type: "signal", name }),
  defineQuery: (name: string) => ({ type: "query", name }),
  defineUpdate: (name: string) => ({ type: "update", name }),
  allHandlersFinished: () => true,
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  proxyActivities: () => ({
    createOrder: async () => ({
      order: { id: 1, referenceId: "ref" },
      clientSecret: "secret",
    }),
    reportPaymentFailed: jest.fn(),
    reportPaymentConfirmed: jest.fn(),
  }),
  setHandler: (
    { name }: { name: string },
    handler: (...args: unknown[]) => unknown,
  ) => handlers.set(name, handler),
  condition: async (predicate: () => boolean) => {
    while (!predicate()) await new Promise(setImmediate);
    return true;
  },
  startChild: () =>
    new Promise((resolve) => {
      finishStart = () =>
        resolve({
          signal: childSignal,
          result: async () => ({ status: "Cancelled" }),
        });
    }),
}));
jest.mock("@temporalio/workflow-streams/workflow", () => ({
  WorkflowStream: class {
    topic = () => ({ publish: jest.fn() });
    detachPollers = jest.fn();
    continueAsNewArgs = jest.fn();
  },
}));
jest.mock("./process-payment.workflow", () => ({
  processPayment: jest.fn(),
}));

import { createOrder } from "./order.workflow";

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("createOrder when cancelling", () => {
  it("forwards a cancellation sent while the payment process starts", async () => {
    const run = createOrder({ order: { referenceId: "ref" } } as never);
    run.catch(() => undefined);
    await tick();
    await handlers.get("createOrderUpdate")?.();
    await tick();
    await tick();

    handlers.get("cancelWorkflowSignal")?.();
    expect(childSignal).not.toHaveBeenCalled();
    finishStart();
    await tick();
    expect(childSignal).toHaveBeenCalledTimes(1);
    await run.catch(() => undefined);
  });
});
