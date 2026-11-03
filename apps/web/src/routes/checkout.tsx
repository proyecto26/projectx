import { useEffect, useRef, useState } from "react";
import type { MetaFunction } from "react-router";
import { useCart } from "react-use-cart";
import invariant from "tiny-invariant";
import { CheckoutPage } from "../pages/CheckoutPage";

import { type OrderWorkflowInput, useOrderWorkflow } from "../providers";
import type { Route } from "./+types/checkout";

export const meta: MetaFunction = () => {
  return [
    { title: "ProjectX - Checkout" },
    {
      name: "description",
      content: "Complete your purchase securely.",
    },
  ];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const loader = async ({ params }: Route.LoaderArgs) => {
  invariant(params?.referenceId, "referenceId is required");
  const { referenceId } = params;
  // It ends up in authenticated requests to the API
  if (!UUID_PATTERN.test(referenceId)) {
    throw new Response("Order not found", { status: 404 });
  }
  return {
    referenceId,
  };
};

export default function Checkout({ loaderData }: Route.ComponentProps) {
  const { items, emptyCart } = useCart();
  const { referenceId } = loaderData;
  // Get the workflow running for this order with that referenceId
  const workflow = useOrderWorkflow(referenceId);
  const hasOrder = !!(workflow.state || workflow.result);
  const workflowInitiatedRef = useRef(false);
  const findStartedRef = useRef(false);
  const { find } = workflow;
  // A finished order isn't kept here, so ask the backend before creating it
  const [lookup, setLookup] = useState<"pending" | "missing" | "found">(
    "pending",
  );
  const [lookupError, setLookupError] = useState<Error>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: It only runs once per page
  useEffect(() => {
    if (!workflow.isHydrated || findStartedRef.current) return;
    findStartedRef.current = true;
    if (hasOrder || workflow.status !== "idle") {
      setLookup("found");
      return;
    }
    find().then(setLookup, setLookupError);
  }, [workflow.isHydrated]);

  // Trigger the creation of the order workflow
  useEffect(() => {
    if (
      lookup === "missing" &&
      !workflowInitiatedRef.current &&
      !hasOrder &&
      workflow.status === "idle" &&
      items.length > 0
    ) {
      workflowInitiatedRef.current = true;
      void workflow.start({
        referenceId,
        billingAddress: "",
        paymentMethod: "",
        shippingAddress: "",
        items: items.map((item) => ({
          productId: Number(item.id),
          quantity: item.quantity ?? 1,
        })),
      } as OrderWorkflowInput);
    }
  }, [lookup, workflow.status, workflow.start, hasOrder, items, referenceId]);

  // Clear the cart once the order exists, so a failure doesn't lose it
  const isOrderCreated = workflowInitiatedRef.current && !!workflow.result;
  useEffect(() => {
    if (isOrderCreated) emptyCart();
  }, [isOrderCreated, emptyCart]);

  return (
    <CheckoutPage
      error={workflow.error ?? lookupError}
      isLoading={
        !workflow.isHydrated ||
        workflow.status === "starting" ||
        (!hasOrder &&
          !lookupError &&
          workflow.status === "idle" &&
          (lookup === "pending" || items.length > 0))
      }
      currentCheckoutWorkflow={workflow}
      cancelOrder={workflow.cancelOrder}
    />
  );
}
