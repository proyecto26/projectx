import { orderActions } from "@projectx/models/workflows";
import {
  createFallbackTransport,
  createHttpStreamTransport,
  createLimitedTransport,
  createPollingTransport,
  defineWorkflow,
  WorkflowClientError,
  type WorkflowTransportOptions,
} from "@proyecto26/temporal-workflow-client";
import { toast } from "react-toastify";

import {
  OrderFailureStatus,
  OrderStatus,
  OrderSuccessStatus,
  type OrderWorkflowInput,
  type OrderWorkflowResult,
  type OrderWorkflowState,
} from "./types/order";

/** What the workflows need from the signed in user. */
export type WorkflowsContext = {
  getAccessToken: () => string;
};

const ordersUrl = () => `${window.ENV.ORDER_API_URL}/order`;

const authHeaders = ({ getAccessToken }: WorkflowsContext) => ({
  Authorization: `Bearer ${getAccessToken()}`,
});

const finalStatus = [...OrderSuccessStatus, ...OrderFailureStatus];

function notifyFinishedOrder({ status }: OrderWorkflowState) {
  if (OrderSuccessStatus.includes(status)) {
    toast.success("Order completed successfully");
    return;
  }
  // The checkout page already explains what happened
  if (!window.location.pathname.includes("/checkout")) {
    toast.error(
      status === OrderStatus.Cancelled
        ? "The transaction was cancelled."
        : "The transaction has failed, please try again.",
    );
  }
}

async function getOrderStatus({
  id,
  signal,
  context,
}: {
  id: string;
  signal?: AbortSignal;
  context: WorkflowsContext;
}): Promise<OrderWorkflowState> {
  const response = await fetch(
    `${ordersUrl()}/status/${encodeURIComponent(id)}`,
    {
      headers: authHeaders(context),
      signal,
    },
  );
  if (!response.ok) {
    throw new WorkflowClientError("Could not read the order status", {
      status: response.status,
    });
  }
  return response.json();
}

/** The orders of a user, followed while the app is open. */
export const orderWorkflow = defineWorkflow({
  type: "order",
  actions: orderActions,
  transport: ({
    context,
    limiter,
  }: WorkflowTransportOptions<WorkflowsContext>) => {
    const stream = createHttpStreamTransport<
      OrderWorkflowState,
      OrderWorkflowInput,
      OrderWorkflowResult
    >({
      startUrl: ordersUrl,
      streamUrl: (id) => `${ordersUrl()}/stream/${encodeURIComponent(id)}`,
      cancelUrl: (id) => `${ordersUrl()}/${encodeURIComponent(id)}`,
      actionUrl: (id, action) =>
        `${ordersUrl()}/${encodeURIComponent(id)}/actions/${encodeURIComponent(action)}`,
      headers: () => authHeaders(context),
      body: ({ input }) => input,
    });
    const polling = createPollingTransport<
      OrderWorkflowState,
      OrderWorkflowInput,
      OrderWorkflowResult
    >({
      start: stream.start,
      cancel: stream.cancel,
      send: stream.send,
      getState: (options) => getOrderStatus({ ...options, context }),
    });
    // Open streams hold browser connections, so the rest of the orders poll.
    // A stream that fails before sending anything polls and frees its slot,
    // then tries the stream again, since the stream starts with a snapshot.
    return createFallbackTransport(
      createLimitedTransport(stream, polling, { limiter }),
      polling,
      { retryPrimary: true },
    );
  },
  isFinal: ({ status }) => finalStatus.includes(status),
  // The backend can decide the id of the order it creates
  resolveId: ({ referenceId }) => referenceId,
  removeOnFinish: true,
  lookup: getOrderStatus,
  onFinish: ({ state }) => {
    if (state) notifyFinishedOrder(state);
  },
  onError: (error, { state, result }, { remove }) => {
    const { status, code } = error as Partial<WorkflowClientError>;
    // The order doesn't exist anymore, unless it is still being created
    if ((status === 404 || code === "not_found") && (state || result)) {
      remove();
    }
  },
});
