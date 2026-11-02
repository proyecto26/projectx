import { useEffect, useRef } from "react";
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

export const loader = async ({ params }: Route.LoaderArgs) => {
  invariant(params?.referenceId, "referenceId is required");
  const { referenceId } = params;
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

  // Trigger the creation of the order workflow
  useEffect(() => {
    if (
      workflow.isHydrated &&
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
  }, [
    workflow.isHydrated,
    workflow.status,
    workflow.start,
    hasOrder,
    items,
    referenceId,
  ]);

  // Clear the cart once the order exists, so a failure doesn't lose it
  const isOrderCreated = workflowInitiatedRef.current && !!workflow.result;
  useEffect(() => {
    if (isOrderCreated) emptyCart();
  }, [isOrderCreated, emptyCart]);

  return (
    <CheckoutPage
      error={workflow.error}
      isLoading={
        !workflow.isHydrated ||
        workflow.status === "starting" ||
        (!hasOrder && workflow.status === "idle" && items.length > 0)
      }
      currentCheckoutWorkflow={workflow}
    />
  );
}
