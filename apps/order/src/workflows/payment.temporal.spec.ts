import path from "node:path";
import {
  cancelWorkflowSignal,
  createOrderUpdate,
  getOrderStateQuery,
  type PaymentWebhookEvent,
  PRODUCT_UNAVAILABLE,
  paymentWebHookEventSignal,
} from "@projectx/core/workflows";
import { WorkflowFailedError } from "@temporalio/client";
import { ApplicationFailure } from "@temporalio/common";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import {
  bundleWorkflowCode,
  DefaultLogger,
  Runtime,
  Worker,
} from "@temporalio/worker";

import { createOrder } from "./order.workflow";

// Runs both workflows on a real Temporal test server, with time skipping and the
// activities replaced, so the order of signals, timers and replay are real

const taskQueue = "payment-test";
let env: TestWorkflowEnvironment;
let workflowBundle: { code: string };
let nextId = 0;

const activities = {
  createOrder: jest.fn(async (data: { order: { referenceId: string } }) => ({
    order: { id: 1, referenceId: data.order.referenceId },
    clientSecret: "secret",
  })),
  cancelPayment: jest.fn(async () => "cancelled"),
  reportPaymentFailed: jest.fn(async () => undefined),
  reportPaymentConfirmed: jest.fn(async () => undefined),
};

beforeAll(async () => {
  Runtime.install({ logger: new DefaultLogger("WARN") });
  env = await TestWorkflowEnvironment.createTimeSkipping();
  workflowBundle = await bundleWorkflowCode({
    workflowsPath: path.join(__dirname, "index.ts"),
    logger: {
      log() {},
      trace() {},
      debug() {},
      info() {},
      warn() {},
      error() {},
    },
  });
}, 240_000);

afterAll(async () => {
  await env?.teardown();
});

beforeEach(() => {
  for (const activity of Object.values(activities)) activity.mockClear();
  activities.cancelPayment.mockImplementation(async () => "cancelled");
});

const event = (
  type: string,
  failure?: PaymentWebhookEvent["failure"],
): PaymentWebhookEvent => ({
  id: `evt_${++nextId}`,
  type,
  provider: "Stripe",
  data: {
    id: "pi_1",
    amount: 100,
    currency: "usd",
    status: "requires_payment_method",
    metadata: { userId: 1, referenceId: "ref" },
  },
  failure,
});

const declined = (attempt: string, retryable = true) =>
  event("payment_intent.payment_failed", {
    attempt,
    reason: retryable ? ("insufficient_funds" as never) : ("declined" as never),
    retryable,
  });

async function withWorker<T>(run: () => Promise<T>) {
  const worker = await Worker.create({
    connection: env.nativeConnection,
    taskQueue,
    workflowBundle,
    activities,
  });
  return worker.runUntil(run);
}

async function startOrder(
  options: { beforeCreating?: PaymentWebhookEvent[] } = {},
) {
  const referenceId = `ref-${++nextId}`;
  const handle = await env.client.workflow.start(createOrder, {
    taskQueue,
    workflowId: `order-${referenceId}`,
    args: [{ user: { id: 1 }, order: { referenceId, items: [] } } as never],
  });
  for (const early of options.beforeCreating ?? []) {
    await handle.signal(paymentWebHookEventSignal, early);
  }
  await handle.executeUpdate(createOrderUpdate);
  return handle;
}

// The child exists once the parent started it, and webhooks need it to arrive
async function untilPaymentStarted(referenceId: string) {
  for (let i = 0; i < 50; i++) {
    try {
      await env.client.workflow.getHandle(`payment-${referenceId}`).describe();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("The payment process didn't start");
}

const referenceOf = (workflowId: string) => workflowId.replace(/^order-/, "");

// The histories of the order and of its payment process replay with this code
async function replayBoth(orderWorkflowId: string) {
  for (const workflowId of [
    orderWorkflowId,
    `payment-${referenceOf(orderWorkflowId)}`,
  ]) {
    const history = await env.client.workflow
      .getHandle(workflowId)
      .fetchHistory();
    await Worker.runReplayHistory({ workflowBundle }, history);
  }
}

describe("payments on a Temporal server", () => {
  it("lets the customer retry a decline and confirms the order", async () => {
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      await handle.signal(paymentWebHookEventSignal, declined("ch_1"));
      await handle.signal(paymentWebHookEventSignal, declined("ch_1"));
      let state = await handle.query(getOrderStateQuery);
      for (let i = 0; i < 50 && !state.paymentFailure; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        state = await handle.query(getOrderStateQuery);
      }
      expect(state.paymentFailure).toEqual({
        reason: "insufficient_funds",
        attempts: 1,
        retryable: true,
      });
      await handle.signal(
        paymentWebHookEventSignal,
        event("payment_intent.succeeded"),
      );
      await handle.result();
      expect(activities.reportPaymentConfirmed).toHaveBeenCalled();
      expect(activities.cancelPayment).not.toHaveBeenCalled();
      expect((await handle.query(getOrderStateQuery)).status).toBe("Confirmed");

      await replayBoth(handle.workflowId);
    });
  }, 60_000);

  it("ends the order on a terminal decline, cancelling the intent", async () => {
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      await handle.signal(paymentWebHookEventSignal, declined("ch_1", false));
      // Late events, after the payment process may already have closed
      await handle.signal(
        paymentWebHookEventSignal,
        event("payment_intent.canceled"),
      );
      await handle.signal(paymentWebHookEventSignal, declined("ch_1", false));
      await expect(handle.result()).rejects.toThrow();
      expect(activities.cancelPayment).toHaveBeenCalledTimes(1);
      expect(activities.reportPaymentFailed).toHaveBeenCalledTimes(1);
      expect(await handle.query(getOrderStateQuery)).toMatchObject({
        status: "Failed",
        paymentFailure: { reason: "declined", attempts: 1, retryable: false },
      });
      expect(activities.reportPaymentConfirmed).not.toHaveBeenCalled();
      await Worker.runReplayHistory(
        { workflowBundle },
        await handle.fetchHistory(),
      );
    });
  }, 60_000);

  it("confirms the order when the intent got paid while closing", async () => {
    activities.cancelPayment.mockImplementation(async () => "paid");
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      await handle.signal(paymentWebHookEventSignal, declined("ch_1", false));
      await handle.result();
      expect(activities.reportPaymentConfirmed).toHaveBeenCalled();
    });
  }, 60_000);

  it("keeps a webhook that arrives before the payment process starts", async () => {
    await withWorker(async () => {
      const handle = await startOrder({
        beforeCreating: [event("payment_intent.succeeded")],
      });
      await handle.result();
      expect(activities.reportPaymentConfirmed).toHaveBeenCalled();
    });
  }, 60_000);

  it("cancels the intent when the time runs out after declines", async () => {
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      await handle.signal(paymentWebHookEventSignal, declined("ch_1"));
      // Time skips while waiting for the result
      await expect(handle.result()).rejects.toThrow();
      expect(activities.cancelPayment).toHaveBeenCalledTimes(1);
      expect(activities.reportPaymentFailed).toHaveBeenCalled();
    });
  }, 60_000);

  it("ends the order after the last allowed attempt", async () => {
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      for (const attempt of ["ch_1", "ch_2", "ch_3", "ch_4", "ch_5"]) {
        await handle.signal(paymentWebHookEventSignal, declined(attempt));
      }
      await expect(handle.result()).rejects.toThrow();
      expect(activities.cancelPayment).toHaveBeenCalledTimes(1);
    });
  }, 60_000);

  it("cancels on request after a decline", async () => {
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      await handle.signal(paymentWebHookEventSignal, declined("ch_1"));
      await handle.signal(cancelWorkflowSignal);
      await expect(handle.result()).rejects.toThrow();
      expect(activities.cancelPayment).toHaveBeenCalledTimes(1);
      expect((await handle.query(getOrderStateQuery)).status).toBe("Cancelled");
      expect(activities.reportPaymentFailed).toHaveBeenCalledWith(
        1,
        "Cancelled",
      );
    });
  }, 60_000);

  it("cancels at once after a failure while the payment was processing", async () => {
    let answer: (outcome: string) => void = () => undefined;
    activities.cancelPayment
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      )
      .mockImplementationOnce(async () => "cancelled");
    await withWorker(async () => {
      const handle = await startOrder();
      await untilPaymentStarted(referenceOf(handle.workflowId));
      await handle.signal(cancelWorkflowSignal);
      for (
        let i = 0;
        i < 50 && activities.cancelPayment.mock.calls.length === 0;
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await handle.signal(paymentWebHookEventSignal, declined("ch_1"));
      answer("processing");
      await expect(handle.result()).rejects.toThrow();
      expect(activities.cancelPayment).toHaveBeenCalledTimes(2);
      expect(activities.reportPaymentFailed).toHaveBeenCalledWith(
        1,
        "Cancelled",
      );
      await replayBoth(handle.workflowId);
    });
  }, 60_000);

  it("rejects an order whose products can't be sold, without retrying", async () => {
    activities.createOrder.mockImplementationOnce(async () => {
      throw ApplicationFailure.nonRetryable(
        "These products aren't available: 8",
        PRODUCT_UNAVAILABLE,
        { productIds: [8] },
      );
    });
    await withWorker(async () => {
      const referenceId = `ref-${++nextId}`;
      const handle = await env.client.workflow.start(createOrder, {
        taskQueue,
        workflowId: `order-${referenceId}`,
        args: [{ user: { id: 1 }, order: { referenceId, items: [] } } as never],
      });

      const update = await handle.executeUpdate(createOrderUpdate).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(update).toBeInstanceOf(Error);
      expect((update as Error).cause).toMatchObject({
        type: PRODUCT_UNAVAILABLE,
      });

      // The workflow closes right away instead of waiting for the order timeout
      const result = await handle.result().then(
        () => undefined,
        (error: unknown) => error,
      );
      expect(result).toBeInstanceOf(WorkflowFailedError);
      expect((result as WorkflowFailedError).cause).toMatchObject({
        type: PRODUCT_UNAVAILABLE,
      });
      expect(activities.createOrder).toHaveBeenCalledTimes(1);
      expect((await handle.query(getOrderStateQuery)).status).toBe("Failed");

      const history = await handle.fetchHistory();
      await Worker.runReplayHistory({ workflowBundle }, history);
    });
  }, 60_000);
});
