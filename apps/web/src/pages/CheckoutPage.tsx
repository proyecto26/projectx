import { canUseDOM } from "@projectx/ui";
import { Elements } from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { motion } from "framer-motion";

import { OrderFailureStatus, type OrderWorkflow } from "@/providers/workflows";
import { CheckoutForm } from "./checkout/CheckoutForm";

const STRIPE_SECRET_KEY = canUseDOM
  ? window?.ENV.STRIPE_PUBLISHABLE_KEY
  : (process.env.STRIPE_PUBLISHABLE_KEY as string);

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
// This is your test publishable API key.
const stripePromise = loadStripe(STRIPE_SECRET_KEY);

interface CheckoutPageProps {
  error?: Error;
  isLoading: boolean;
  currentCheckoutWorkflow?: OrderWorkflow;
  cancelOrder?: {
    send: () => unknown;
    isPending: boolean;
    error?: Error;
  };
}

const appearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#9333ea", // purple-600
    colorBackground: "#ffffff",
    colorText: "#111827", // gray-900
    colorDanger: "#dc2626", // red-600
    fontFamily: "system-ui, sans-serif",
    spacingUnit: "4px",
    borderRadius: "8px",
  },
  rules: {
    ".Input": {
      backgroundColor: "#f3f4f6", // gray-100
      color: "#111827", // gray-900
    },
    ".Input--invalid": {
      color: "#dc2626", // red-600
    },
    ".Label": {
      color: "#374151", // gray-700
    },
    ".Tab": {
      backgroundColor: "#f3f4f6", // gray-100
      color: "#374151", // gray-700
    },
    ".Tab--selected": {
      backgroundColor: "#9333ea", // purple-600
      color: "#ffffff",
    },
  },
};

export const CheckoutPage = ({
  error,
  isLoading,
  currentCheckoutWorkflow,
  cancelOrder,
}: CheckoutPageProps) => {
  if (isLoading) {
    // Skeleton for payment form
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <div className="text-center">
          <p className="font-semibold text-base text-purple-600 dark:text-purple-400">
            404
          </p>
          <h1 className="mt-2 font-bold text-3xl text-gray-900 dark:text-white">
            Loading...
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            Please wait while we load the payment form.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <div className="text-center">
          <p className="font-semibold text-base text-purple-600 dark:text-purple-400">
            404
          </p>
          <h1 className="mt-2 font-bold text-3xl text-gray-900 dark:text-white">
            Payment not found
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            The payment session you're looking for doesn't exist or has expired.
          </p>
        </div>
      </div>
    );
  }

  const status = currentCheckoutWorkflow?.state?.status;
  if (status && OrderFailureStatus.includes(status)) {
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <div className="text-center">
          <h1 className="font-bold text-3xl text-gray-900 dark:text-white">
            This order is no longer active
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
            It was cancelled or its payment failed.
          </p>
        </div>
      </div>
    );
  }

  const clientSecret =
    currentCheckoutWorkflow?.result?.clientSecret ??
    currentCheckoutWorkflow?.state?.clientSecret;

  if (!clientSecret) {
    return (
      <div className="flex flex-grow items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800"
        >
          <div className="text-center">
            <p className="font-semibold text-base text-purple-600 dark:text-purple-400">
              404
            </p>
            <h1 className="mt-2 font-bold text-3xl text-gray-900 dark:text-white">
              Payment not found
            </h1>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              The payment session you're looking for doesn't exist or has
              expired.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="flex flex-grow items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800"
      >
        <h2 className="mb-6 font-bold text-3xl text-gray-900 dark:text-white">
          Complete Payment
        </h2>
        <div className="space-y-8">
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm currentCheckoutWorkflow={currentCheckoutWorkflow} />
          </Elements>
          {cancelOrder && (
            <div className="text-center">
              <button
                type="button"
                disabled={cancelOrder.isPending}
                onClick={() => cancelOrder.send()}
                className="text-gray-500 text-sm underline hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {cancelOrder.isPending ? "Cancelling..." : "Cancel order"}
              </button>
              {cancelOrder.error && (
                <p role="alert" className="mt-2 text-red-600 text-sm">
                  {cancelOrder.error.message}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
