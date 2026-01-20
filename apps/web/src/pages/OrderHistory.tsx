import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";

const orders = [
  {
    number: "WU88191111",
    href: "#",
    invoiceHref: "#",
    createdDate: "Jul 6, 2021",
    createdDatetime: "2021-07-06",
    deliveredDate: "July 12, 2021",
    deliveredDatetime: "2021-07-12",
    total: "$160.00",
    products: [
      {
        id: 1,
        name: "Micro Backpack",
        description:
          "Are you a minimalist looking for a compact carry option? The Micro Backpack is the perfect size for your essential everyday carry items. Wear it like a backpack or carry it like a satchel for all-day use.",
        href: "#",
        price: "$70.00",
        imageSrc:
          "https://tailwindui.com/plus/img/ecommerce-images/order-history-page-03-product-01.jpg",
        imageAlt:
          "Moss green canvas compact backpack with double top zipper, zipper front pouch, and matching carry handle and backpack straps.",
      },
      // More products...
    ],
  },
  // More orders...
];

export function OrderHistory() {
  return (
    <div className="bg-white dark:bg-gray-900">
      <div className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl sm:px-2 lg:px-8">
          <div className="mx-auto max-w-2xl px-4 lg:max-w-4xl lg:px-0">
            <h1 className="font-bold text-2xl text-gray-900 tracking-tight sm:text-3xl dark:text-gray-100">
              Order history
            </h1>
            <p className="mt-2 text-gray-500 text-sm dark:text-gray-400">
              Check the status of recent orders, manage returns, and discover
              similar products.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="sr-only">Recent orders</h2>
          <div className="mx-auto max-w-7xl sm:px-2 lg:px-8">
            <div className="mx-auto max-w-2xl space-y-8 sm:px-4 lg:max-w-4xl lg:px-0">
              {orders.map((order) => (
                <div
                  key={order.number}
                  className="border-gray-200 border-t border-b bg-white shadow-sm sm:rounded-lg sm:border dark:bg-gray-800"
                >
                  <h3 className="sr-only">
                    Order placed on{" "}
                    <time dateTime={order.createdDatetime}>
                      {order.createdDate}
                    </time>
                  </h3>

                  <div className="flex items-center border-gray-200 border-b p-4 sm:grid sm:grid-cols-4 sm:gap-x-6 sm:p-6 dark:border-gray-700">
                    <dl className="grid flex-1 grid-cols-2 gap-x-6 text-sm sm:col-span-3 sm:grid-cols-3 lg:col-span-2">
                      <div>
                        <dt className="font-medium text-gray-900 dark:text-gray-100">
                          Order number
                        </dt>
                        <dd className="mt-1 text-gray-500 dark:text-gray-400">
                          {order.number}
                        </dd>
                      </div>
                      <div className="hidden sm:block">
                        <dt className="font-medium text-gray-900 dark:text-gray-100">
                          Date placed
                        </dt>
                        <dd className="mt-1 text-gray-500 dark:text-gray-400">
                          <time dateTime={order.createdDatetime}>
                            {order.createdDate}
                          </time>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900 dark:text-gray-100">
                          Total amount
                        </dt>
                        <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                          {order.total}
                        </dd>
                      </div>
                    </dl>

                    <Menu
                      as="div"
                      className="relative flex justify-end lg:hidden"
                    >
                      <div className="flex items-center">
                        <MenuButton className="-m-2 flex items-center p-2 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400">
                          <span className="sr-only">
                            Options for order {order.number}
                          </span>
                          <EllipsisVerticalIcon
                            aria-hidden="true"
                            className="h-6 w-6"
                          />
                        </MenuButton>
                      </div>

                      <MenuItems className="absolute right-0 z-10 mt-2 w-40 origin-bottom-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-gray-800">
                        <div className="py-1">
                          <MenuItem>
                            <a
                              href={order.href}
                              className="block px-4 py-2 text-gray-700 text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              View
                            </a>
                          </MenuItem>
                          <MenuItem>
                            <a
                              href={order.invoiceHref}
                              className="block px-4 py-2 text-gray-700 text-sm hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                            >
                              Invoice
                            </a>
                          </MenuItem>
                        </div>
                      </MenuItems>
                    </Menu>

                    <div className="hidden lg:col-span-2 lg:flex lg:items-center lg:justify-end lg:space-x-4">
                      <a
                        href={order.href}
                        className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        <span>View Order</span>
                        <span className="sr-only">{order.number}</span>
                      </a>
                      <a
                        href={order.invoiceHref}
                        className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-2.5 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                      >
                        <span>View Invoice</span>
                        <span className="sr-only">
                          for order {order.number}
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Products */}
                  <h4 className="sr-only">Items</h4>
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {order.products.map((product) => (
                      <li key={product.id} className="p-4 sm:p-6">
                        <div className="flex items-center sm:items-start">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200 sm:h-40 sm:w-40 dark:bg-gray-700">
                            <img
                              alt={product.imageAlt}
                              src={product.imageSrc}
                              className="h-full w-full object-cover object-center"
                            />
                          </div>
                          <div className="ml-6 flex-1 text-sm">
                            <div className="font-medium text-gray-900 sm:flex sm:justify-between dark:text-gray-100">
                              <h5>{product.name}</h5>
                              <p className="mt-2 sm:mt-0 dark:text-gray-300">
                                {product.price}
                              </p>
                            </div>
                            <p className="hidden text-gray-500 sm:mt-2 sm:block dark:text-gray-400">
                              {product.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 sm:flex sm:justify-between">
                          <div className="flex items-center">
                            <CheckCircleIcon
                              aria-hidden="true"
                              className="h-5 w-5 text-green-500"
                            />
                            <p className="ml-2 font-medium text-gray-500 text-sm dark:text-gray-400">
                              Delivered on{" "}
                              <time dateTime={order.deliveredDatetime}>
                                {order.deliveredDate}
                              </time>
                            </p>
                          </div>

                          <div className="mt-6 flex items-center space-x-4 divide-x divide-gray-200 border-gray-200 border-t pt-4 font-medium text-sm sm:mt-0 sm:ml-4 sm:border-none sm:pt-0 dark:divide-gray-700 dark:border-gray-700">
                            <div className="flex flex-1 justify-center">
                              <a
                                href={product.href}
                                className="whitespace-nowrap text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                View product
                              </a>
                            </div>
                            <div className="flex flex-1 justify-center pl-4">
                              <a
                                href="#"
                                className="whitespace-nowrap text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                              >
                                Buy again
                              </a>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
