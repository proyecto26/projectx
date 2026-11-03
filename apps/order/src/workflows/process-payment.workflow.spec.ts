import { OrderProcessPaymentStatus as Status } from "@projectx/core/workflows";

const cancelPayment = jest.fn();
const handlers = new Map<string, (...args: unknown[]) => void>();
let waiters: Array<() => void> = [];
const wake = () => {
  for (const waiter of waiters) waiter();
};

// Runs the workflow in a test, controlling when signals and activities happen
jest.mock("@temporalio/workflow", () => ({
  defineSignal: (name: string) => ({ type: "signal", name }),
  defineQuery: (name: string) => ({ type: "query", name }),
  defineUpdate: (name: string) => ({ type: "update", name }),
  allHandlersFinished: () => true,
  log: { info: jest.fn(), warn: jest.fn() },
  proxyActivities: () => ({
    cancelPayment: (...args: unknown[]) => cancelPayment(...args),
  }),
  setHandler: (
    { name }: { name: string },
    handler: (...args: unknown[]) => void,
  ) => handlers.set(name, handler),
  condition: (predicate: () => boolean, timeout?: string) =>
    new Promise<boolean>((resolve) => {
      const check = () => {
        if (predicate()) resolve(true);
      };
      waiters.push(check);
      check();
      if (timeout) timeouts.push(() => resolve(false));
    }),
}));

let timeouts: Array<() => void> = [];

import { processPayment } from "./process-payment.workflow";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const data = { order: { referenceId: "ref" } } as never;
const cancel = () => {
  handlers.get("cancelWorkflowSignal")?.();
  wake();
};
const webhook = (type: string) => {
  handlers.get("paymentWebhookEvent")?.({ type });
  wake();
};

describe("processPayment when cancelling", () => {
  beforeEach(() => {
    cancelPayment.mockReset();
    handlers.clear();
    waiters = [];
    timeouts = [];
  });

  it("ends cancelled when the provider cancels it", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    cancel();
    await expect(run).resolves.toEqual({ status: Status.CANCELLED });
    expect(cancelPayment).toHaveBeenCalledWith("ref");
  });

  it("succeeds when the customer had already paid", async () => {
    cancelPayment.mockResolvedValue("paid");
    const run = processPayment(data);
    cancel();
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
  });

  it("waits for the webhook while the payment is processing", async () => {
    cancelPayment.mockResolvedValue("processing");
    const run = processPayment(data);
    cancel();
    await tick();
    webhook("payment_intent.succeeded");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
  });

  it("keeps a success that arrives while the activity is running", async () => {
    let answer: (outcome: string) => void = () => undefined;
    cancelPayment.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const run = processPayment(data);
    cancel();
    await tick();
    webhook("payment_intent.succeeded");
    answer("processing");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
  });

  it("cancels again if asked while processing", async () => {
    cancelPayment
      .mockResolvedValueOnce("processing")
      .mockResolvedValueOnce("cancelled");
    const run = processPayment(data);
    cancel();
    await tick();
    cancel();
    await expect(run).resolves.toEqual({ status: Status.CANCELLED });
    expect(cancelPayment).toHaveBeenCalledTimes(2);
  });

  it("doesn't call the provider without a cancellation", async () => {
    const run = processPayment(data);
    webhook("payment_intent.succeeded");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
    expect(cancelPayment).not.toHaveBeenCalled();
  });
});
