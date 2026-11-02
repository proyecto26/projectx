import { canUseDOM } from "@projectx/ui";
import {
  createFallbackTransport,
  createHttpStreamTransport,
  createPollingTransport,
  WorkflowClientError,
  WorkflowRegistry,
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

const ordersUrl = () => `${window.ENV.ORDER_API_URL}/order`;

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

/** Keeps the orders of a user, following them while the app is open. */
export function createOrderRegistry({
  email,
  getAccessToken,
}: {
  email?: string;
  getAccessToken: () => string;
}) {
  const headers = () => ({ Authorization: `Bearer ${getAccessToken()}` });

  const stream = createHttpStreamTransport<
    OrderWorkflowState,
    OrderWorkflowInput,
    OrderWorkflowResult
  >({
    startUrl: ordersUrl,
    streamUrl: (id) => `${ordersUrl()}/stream/${id}`,
    cancelUrl: (id) => `${ordersUrl()}/${id}`,
    headers,
    body: ({ input }) => input,
  });

  const polling = createPollingTransport<
    OrderWorkflowState,
    OrderWorkflowInput,
    OrderWorkflowResult
  >({
    start: stream.start,
    cancel: stream.cancel,
    getState: async ({ id, signal }) => {
      const response = await fetch(`${ordersUrl()}/status/${id}`, {
        headers: headers(),
        signal,
      });
      if (!response.ok) {
        throw new WorkflowClientError("Could not read the order status", {
          status: response.status,
        });
      }
      return response.json();
    },
  });

  const registry = new WorkflowRegistry<
    OrderWorkflowState,
    OrderWorkflowInput,
    OrderWorkflowResult
  >({
    transport: createFallbackTransport(stream, polling),
    isFinal: ({ status }) => finalStatus.includes(status),
    storage: canUseDOM && email ? window.localStorage : undefined,
    storageKey: `order-workflows:${email}`,
    onFinish: ({ state }) => {
      if (state) notifyFinishedOrder(state);
    },
    onError: (error, { id, state, result }) => {
      const { status, code } = error as Partial<WorkflowClientError>;
      // The order doesn't exist anymore, unless it is still being created
      if ((status === 404 || code === "not_found") && (state || result)) {
        registry.remove(id);
      }
    },
  });
  return registry;
}
