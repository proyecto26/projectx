import type { OrderSummaryDto } from "@projectx/models";
import { useSearchParams } from "react-router";

interface OrderSummaryProps {
  order: OrderSummaryDto;
}

export default function OrderSummary({ order }: OrderSummaryProps) {
  const [searchParams] = useSearchParams();

  return (
    <div className="relative lg:min-h-full">
      <div className="h-80 overflow-hidden lg:absolute lg:h-full lg:w-1/2 lg:pr-4 xl:pr-12">
        <img
          alt="Order hero"
          src="https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?ixlib=rb-4.0.3&amp;ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&amp;auto=format&amp;fit=crop&amp;w=2102&amp;q=80"
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div>
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-24 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8 lg:py-32 xl:gap-x-24">
          <div className="lg:col-start-2">
            <h1 className="font-medium text-indigo-600 text-sm dark:text-indigo-400">
              Payment successful
            </h1>
            <p className="mt-2 font-bold text-4xl text-gray-900 tracking-tight sm:text-5xl dark:text-gray-100">
              Thanks for ordering
            </p>
            <p className="mt-2 text-base text-gray-500 dark:text-gray-400">
              We appreciate your order, we’re currently processing it. So hang
              tight and we’ll send you confirmation very soon!
            </p>

            <dl className="mt-16 font-medium text-sm">
              <dt className="text-gray-900 dark:text-gray-100">
                Tracking number
              </dt>
              <dd className="mt-2 text-indigo-600 dark:text-indigo-400">
                {order.referenceId}
              </dd>
            </dl>

            <ul className="mt-6 divide-y divide-gray-200 border-gray-200 border-t font-medium text-gray-500 text-sm dark:divide-gray-700 dark:border-gray-700 dark:text-gray-400">
              {order.items?.map((item) => (
                <li key={item.productId} className="flex space-x-6 py-6">
                  <img
                    alt={item.product?.name || "Product"}
                    src={item.product?.imageUrl || "https://placehold.co/400"}
                    style={{
                      viewTransitionName: `product-${item.productId}`,
                    }}
                    className="h-24 w-24 flex-none rounded-md bg-gray-100 object-cover object-center dark:bg-gray-700"
                  />
                  <div className="flex-auto space-y-1">
                    <h3 className="text-gray-900 dark:text-gray-100">
                      {item.product?.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Quantity: {item.quantity}
                    </p>
                  </div>
                  <p className="flex-none font-medium text-gray-900 dark:text-gray-100">
                    $
                    {(
                      (item.product?.estimatedPrice || 0) * item.quantity
                    ).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="space-y-6 border-gray-200 border-t pt-6 font-medium text-gray-500 text-sm dark:border-gray-700 dark:text-gray-400">
              <div className="flex justify-between">
                <dt className="text-gray-900 dark:text-gray-100">Subtotal</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  ${order.subtotal.toFixed(2)}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-gray-900 dark:text-gray-100">Shipping</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  ${order.shippingCost?.toFixed(2)}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-gray-900 dark:text-gray-100">Taxes</dt>
                <dd className="text-gray-900 dark:text-gray-100">
                  ${order.taxAmount?.toFixed(2)}
                </dd>
              </div>

              <div className="flex items-center justify-between border-gray-200 border-t pt-6 text-gray-900 dark:border-gray-700 dark:text-gray-100">
                <dt className="text-base">Total</dt>
                <dd className="text-base">${order.totalPrice.toFixed(2)}</dd>
              </div>
            </dl>

            <dl className="mt-16 grid grid-cols-2 gap-x-4 text-gray-600 text-sm dark:text-gray-400">
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">
                  Shipping Address
                </dt>
                <dd className="mt-2">
                  <address className="whitespace-pre-line text-gray-600 not-italic dark:text-gray-400">
                    {order.shippingAddress || "No shipping address provided"}
                  </address>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">
                  Payment Information
                </dt>
                <dd className="mt-2 space-y-2 sm:flex sm:space-x-4 sm:space-y-0">
                  <div className="flex-none">
                    <svg
                      width={36}
                      height={24}
                      viewBox="0 0 36 24"
                      aria-hidden="true"
                      className="h-6 w-auto"
                    >
                      <rect rx={4} fill="#224DBA" width={36} height={24} />
                      <path
                        d="M10.925 15.673H8.874l-1.538-6c-.073-.276-.228-.52-.456-.635A6.575 6.575 0 005 8.403v-.231h3.304c.456 0 .798.347.855.75l.798 4.328 2.05-5.078h1.994l-3.076 7.5zm4.216 0h-1.937L14.8 8.172h1.937l-1.595 7.5zm4.101-5.422c.057-.404.399-.635.798-.635a3.54 3.54 0 011.88.346l.342-1.615A4.808 4.808 0 0020.496 8c-1.88 0-3.248 1.039-3.248 2.481 0 1.097.969 1.673 1.653 2.02.74.346 1.025.577.968.923 0 .519-.57.75-1.139.75a4.795 4.795 0 01-1.994-.462l-.342 1.616a5.48 5.48 0 002.108.404c2.108.057 3.418-.981 3.418-2.539 0-1.962-2.678-2.077-2.678-2.942zm9.457 5.422L27.16 8.172h-1.652a.858.858 0 00-.798.577l-2.848 6.924h1.994l.398-1.096h2.45l.228 1.096h1.766zm-2.905-5.482l.57 2.827h-1.596l1.026-2.827z"
                        fill="#fff"
                      />
                    </svg>
                    <p className="sr-only">Visa</p>
                  </div>
                  <div className="flex-auto">
                    {order.payment?.cardBrand ? (
                      <>
                        <p className="text-gray-900 dark:text-gray-100">
                          {order.payment.cardBrand} ending with{" "}
                          {order.payment.last4}
                        </p>
                        <p className="dark:text-gray-400">
                          Expires {order.payment.expMonth} /{" "}
                          {String(order.payment.expYear).slice(-2)}
                        </p>
                      </>
                    ) : (
                      <p className="text-gray-900 dark:text-gray-100">
                        Status: {order.status}
                      </p>
                    )}
                    {(searchParams.get("payment_intent") ||
                      order.payment?.transactionId) && (
                      <p className="mt-1 max-w-[150px] truncate text-xs dark:text-gray-400">
                        ID:{" "}
                        {order.payment?.transactionId ||
                          searchParams.get("payment_intent")}
                      </p>
                    )}
                  </div>
                </dd>
              </div>
            </dl>

            <div className="mt-16 border-gray-200 border-t py-6 text-right dark:border-gray-700">
              <a
                href="/"
                className="font-medium text-indigo-600 text-sm hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Continue Shopping
                <span aria-hidden="true"> &rarr;</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
