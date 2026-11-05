import { OrderProcessPaymentStatus as Status } from "@projectx/core/workflows";

const cancelPayment = jest.fn();
const progress: unknown[] = [];
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
  workflowInfo: () => ({ parent: { workflowId: "order", runId: "run" } }),
  getExternalWorkflowHandle: () => ({
    signal: (_: unknown, failure: unknown) => {
      progress.push(failure);
      return Promise.resolve();
    },
  }),
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
let eventId = 0;
const webhook = (type: string, extra: Record<string, unknown> = {}) => {
  handlers.get("paymentWebhookEvent")?.({
    id: `evt_${++eventId}`,
    type,
    ...extra,
  });
  wake();
};
const decline = (attempt: string, retryable = true, reason = "declined") =>
  webhook("payment_intent.payment_failed", {
    failure: { attempt, reason, retryable },
  });

describe("processPayment when cancelling", () => {
  beforeEach(() => {
    cancelPayment.mockReset();
    handlers.clear();
    waiters = [];
    timeouts = [];
    progress.length = 0;
  });

  it("ends cancelled when the provider cancels it", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    cancel();
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
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

  it("asks the provider again when the webhook never arrives", async () => {
    cancelPayment
      .mockResolvedValueOnce("processing")
      .mockResolvedValueOnce("paid");
    const run = processPayment(data);
    cancel();
    await tick();
    timeouts[timeouts.length - 1]?.();
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
    expect(cancelPayment).toHaveBeenCalledTimes(2);
  });

  it("doesn't lose the request when a webhook arrives with it", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    cancel();
    webhook("payment_intent.processing");
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
    expect(cancelPayment).toHaveBeenCalledTimes(1);
  });

  it("confirms the payment even if the provider never answers", async () => {
    cancelPayment.mockReturnValue(new Promise(() => undefined));
    const run = processPayment(data);
    cancel();
    await tick();
    webhook("payment_intent.succeeded");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
  });

  it("cancels again after a failed attempt while processing", async () => {
    cancelPayment
      .mockResolvedValueOnce("processing")
      .mockResolvedValueOnce("cancelled");
    const run = processPayment(data);
    cancel();
    await tick();
    webhook("payment_intent.payment_failed");
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
    expect(cancelPayment).toHaveBeenCalledTimes(2);
  });

  it("asks again at once when an attempt fails during the activity", async () => {
    let answer: (outcome: string) => void = () => undefined;
    cancelPayment
      .mockReturnValueOnce(
        new Promise((resolve) => {
          answer = resolve;
        }),
      )
      .mockResolvedValueOnce("cancelled");
    const run = processPayment(data);
    cancel();
    await tick();
    webhook("payment_intent.payment_failed");
    answer("processing");
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
    expect(cancelPayment).toHaveBeenCalledTimes(2);
  });

  it("cancels with the provider after a failed attempt", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    webhook("payment_intent.payment_failed");
    cancel();
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
    expect(cancelPayment).toHaveBeenCalledTimes(1);
  });

  it("doesn't call the provider without a cancellation", async () => {
    const run = processPayment(data);
    webhook("payment_intent.succeeded");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
    expect(cancelPayment).not.toHaveBeenCalled();
  });
});

describe("processPayment when a payment is declined", () => {
  beforeEach(() => {
    cancelPayment.mockReset();
    handlers.clear();
    waiters = [];
    timeouts = [];
    progress.length = 0;
  });

  it("lets the customer try again and pay the same order", async () => {
    const run = processPayment(data);
    decline("ch_1", true, "insufficient_funds");
    await tick();
    expect(progress).toEqual([
      { reason: "insufficient_funds", attempts: 1, retryable: true },
    ]);
    webhook("payment_intent.succeeded");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
    expect(cancelPayment).not.toHaveBeenCalled();
  });

  it("ends the order on a decline that can't be retried, cancelling the intent", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    decline("ch_1", false);
    await expect(run).resolves.toMatchObject({ status: Status.DECLINED });
    expect(cancelPayment).toHaveBeenCalledWith("ref");
    expect(progress).toEqual([
      { reason: "declined", attempts: 1, retryable: false },
    ]);
  });

  it("confirms the order when the intent was paid before it could be cancelled", async () => {
    cancelPayment.mockResolvedValue("paid");
    const run = processPayment(data);
    decline("ch_1", false);
    await expect(run).resolves.toMatchObject({ status: Status.SUCCESS });
  });

  it("ends the order after the last allowed attempt", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    for (const attempt of ["ch_1", "ch_2", "ch_3", "ch_4"]) decline(attempt);
    await tick();
    expect(cancelPayment).not.toHaveBeenCalled();
    decline("ch_5");
    await expect(run).resolves.toMatchObject({ status: Status.DECLINED });
    expect(progress[progress.length - 1]).toEqual({
      reason: "declined",
      attempts: 5,
      retryable: false,
    });
  });

  it("counts an attempt once, even in two events", async () => {
    const run = processPayment(data);
    decline("ch_1");
    decline("ch_1");
    handlers.get("paymentWebhookEvent")?.({
      id: "evt_same",
      type: "payment_intent.payment_failed",
      failure: { attempt: "ch_2", reason: "declined", retryable: true },
    });
    handlers.get("paymentWebhookEvent")?.({
      id: "evt_same",
      type: "payment_intent.payment_failed",
      failure: { attempt: "ch_3", reason: "declined", retryable: true },
    });
    await tick();
    expect(progress[progress.length - 1]).toMatchObject({ attempts: 2 });
    webhook("payment_intent.succeeded");
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
  });

  it("never lets a late failure undo a payment", async () => {
    const run = processPayment(data);
    webhook("payment_intent.succeeded");
    decline("ch_1", false);
    await expect(run).resolves.toEqual({ status: Status.SUCCESS });
    expect(cancelPayment).not.toHaveBeenCalled();
  });

  it("cancels the intent when the time runs out after a decline", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    decline("ch_1");
    await tick();
    timeouts[0]?.();
    await expect(run).resolves.toMatchObject({ status: Status.FAILURE });
    expect(cancelPayment).toHaveBeenCalledTimes(1);
  });

  it("shows a cancellation as cancelled, even after the last attempt", async () => {
    let answer: (outcome: string) => void = () => undefined;
    cancelPayment.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const run = processPayment(data);
    decline("ch_1", false);
    await tick();
    cancel();
    answer("cancelled");
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
  });

  it("ends when the provider cancels the intent", async () => {
    const run = processPayment(data);
    webhook("payment_intent.canceled");
    await expect(run).resolves.toMatchObject({ status: Status.CANCELLED });
    expect(cancelPayment).not.toHaveBeenCalled();
  });

  it("stops offering a retry once the order is closing", async () => {
    cancelPayment.mockResolvedValue("cancelled");
    const run = processPayment(data);
    decline("ch_1");
    await tick();
    cancel();
    await run;
    expect(progress).toEqual([
      { reason: "declined", attempts: 1, retryable: true },
      { reason: "declined", attempts: 1, retryable: false },
    ]);
  });
});
