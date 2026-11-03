import { motion } from "framer-motion";
import { Check, Package, ShoppingBag } from "lucide-react";
import type React from "react";
import { Link, useParams } from "react-router";

import { PageLayout } from "@/pages/PageLayout";

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  const orderNumber = orderId ? `#PX-${orderId}` : "#PX-2026-0842";

  return (
    <PageLayout>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[520px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-700 dark:bg-gray-900">
            {/* Check icon */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check
                  className="h-8 w-8 text-green-600 dark:text-green-400"
                  strokeWidth={2.5}
                />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
            >
              <h1
                className="mt-6 font-bold text-[28px] text-gray-900 dark:text-gray-100"
                style={{ letterSpacing: "-0.5px" }}
              >
                Order confirmed!
              </h1>
              <p
                className="mt-3 text-[15px] text-gray-500 dark:text-gray-400"
                style={{ lineHeight: 1.6 }}
              >
                Thank you for your purchase. We've sent a confirmation email
                with your order details and tracking information.
              </p>
            </motion.div>

            {/* Order details card */}
            <motion.div
              className="mt-8 rounded-xl bg-slate-100 p-5 text-left dark:bg-slate-800"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
            >
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="flex items-center justify-between py-3 first:pt-0">
                  <dt className="text-gray-500 text-sm dark:text-gray-400">
                    Order number
                  </dt>
                  <dd className="font-bold text-gray-900 text-sm dark:text-gray-100">
                    {orderNumber}
                  </dd>
                </div>

                <div className="flex items-center justify-between py-3">
                  <dt className="text-gray-500 text-sm dark:text-gray-400">
                    Estimated delivery
                  </dt>
                  <dd className="font-bold text-gray-900 text-sm dark:text-gray-100">
                    Mar 2 - 5, 2026
                  </dd>
                </div>

                <div className="flex items-center justify-between py-3 last:pb-0">
                  <dt className="text-gray-500 text-sm dark:text-gray-400">
                    Total
                  </dt>
                  <dd className="font-bold text-gray-900 text-sm dark:text-gray-100">
                    $247.99
                  </dd>
                </div>
              </dl>
            </motion.div>

            {/* Action buttons */}
            <motion.div
              className="mt-8 flex flex-col gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35, ease: "easeOut" }}
            >
              <Link
                to={`/order/${orderId}/track`}
                className="btn btn-primary w-full gap-2"
              >
                <Package className="h-4 w-4" />
                Track Order
              </Link>

              <Link to="/marketplace" className="btn btn-outline w-full gap-2">
                <ShoppingBag className="h-4 w-4" />
                Continue Shopping
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
