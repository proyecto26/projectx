import { classnames } from "@projectx/ui";

const products = [
  {
    id: 1,
    name: "Nomad Tumbler",
    description:
      "This durable and portable insulated tumbler will keep your beverage at the perfect temperature during your next adventure.",
    href: "#",
    price: "35.00",
    status: "Preparing to ship",
    step: 1,
    date: "March 24, 2021",
    datetime: "2021-03-24",
    address: ["Floyd Miles", "7363 Cynthia Pass", "Toronto, ON N3Y 4H8"],
    email: "f•••@example.com",
    phone: "1•••••••••40",
    imageSrc:
      "https://tailwindui.com/plus/img/ecommerce-images/confirmation-page-03-product-01.jpg",
    imageAlt: "Insulated bottle with white base and black snap lid.",
  },
  {
    id: 2,
    name: "Minimalist Wristwatch",
    description:
      "This contemporary wristwatch has a clean, minimalist look and high quality components.",
    href: "#",
    price: "149.00",
    status: "Shipped",
    step: 0,
    date: "March 23, 2021",
    datetime: "2021-03-23",
    address: ["Floyd Miles", "7363 Cynthia Pass", "Toronto, ON N3Y 4H8"],
    email: "f•••@example.com",
    phone: "1•••••••••40",
    imageSrc:
      "https://tailwindui.com/plus/img/ecommerce-images/confirmation-page-03-product-02.jpg",
    imageAlt:
      "Arm modeling wristwatch with black leather band, white watch face, thin watch hands, and fine time markings.",
  },
  // More products...
];

export const OrderPage: React.FC = () => {
  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-2xl pt-16 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8">
        <div className="space-y-2 px-4 sm:flex sm:items-baseline sm:justify-between sm:space-y-0 sm:px-0">
          <div className="flex sm:items-baseline sm:space-x-4">
            <h1 className="font-bold text-2xl text-gray-900 tracking-tight sm:text-3xl dark:text-gray-100">
              Order #54879
            </h1>
            <a
              href="#"
              className="hidden font-medium text-indigo-600 text-sm hover:text-indigo-500 sm:block dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View invoice
              <span aria-hidden="true"> &rarr;</span>
            </a>
          </div>
          <p className="text-gray-600 text-sm dark:text-gray-400">
            Order placed{" "}
            <time
              dateTime="2021-03-22"
              className="font-medium text-gray-900 dark:text-gray-100"
            >
              March 22, 2021
            </time>
          </p>
          <a
            href="#"
            className="font-medium text-indigo-600 text-sm hover:text-indigo-500 sm:hidden dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            View invoice
            <span aria-hidden="true"> &rarr;</span>
          </a>
        </div>

        {/* Products */}
        <div className="mt-6">
          <h2 className="sr-only">Products purchased</h2>

          <div className="space-y-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="border-gray-200 border-t border-b bg-white shadow-sm sm:rounded-lg sm:border dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="px-4 py-6 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:p-8">
                  <div className="sm:flex lg:col-span-7">
                    <div className="aspect-h-1 aspect-w-1 w-full flex-shrink-0 overflow-hidden rounded-lg sm:aspect-none sm:h-40 sm:w-40">
                      <img
                        alt={product.imageAlt}
                        src={product.imageSrc}
                        className="h-full w-full object-cover object-center sm:h-full sm:w-full"
                      />
                    </div>

                    <div className="mt-6 sm:mt-0 sm:ml-6">
                      <h3 className="font-medium text-base text-gray-900 dark:text-gray-100">
                        <a href={product.href}>{product.name}</a>
                      </h3>
                      <p className="mt-2 font-medium text-gray-900 text-sm dark:text-gray-100">
                        ${product.price}
                      </p>
                      <p className="mt-3 text-gray-500 text-sm dark:text-gray-400">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 lg:col-span-5 lg:mt-0">
                    <dl className="grid grid-cols-2 gap-x-6 text-sm">
                      <div>
                        <dt className="font-medium text-gray-900 dark:text-gray-100">
                          Delivery address
                        </dt>
                        <dd className="mt-3 text-gray-500 dark:text-gray-400">
                          <span className="block">{product.address[0]}</span>
                          <span className="block">{product.address[1]}</span>
                          <span className="block">{product.address[2]}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-900 dark:text-gray-100">
                          Shipping updates
                        </dt>
                        <dd className="mt-3 space-y-3 text-gray-500 dark:text-gray-400">
                          <p>{product.email}</p>
                          <p>{product.phone}</p>
                          <button
                            type="button"
                            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Edit
                          </button>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="border-gray-200 border-t px-4 py-6 sm:px-6 lg:p-8 dark:border-gray-700">
                  <h4 className="sr-only">Status</h4>
                  <p className="font-medium text-gray-900 text-sm dark:text-gray-100">
                    {product.status} on{" "}
                    <time dateTime={product.datetime}>{product.date}</time>
                  </p>
                  <div aria-hidden="true" className="mt-6">
                    <div className="overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        style={{
                          width: `calc((${product.step} * 2 + 1) / 8 * 100%)`,
                        }}
                        className="h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
                      />
                    </div>
                    <div className="mt-6 hidden grid-cols-4 font-medium text-gray-600 text-sm sm:grid dark:text-gray-400">
                      <div className="text-indigo-600 dark:text-indigo-400">
                        Order placed
                      </div>
                      <div
                        className={classnames(
                          product.step > 0
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "",
                          "text-center",
                        )}
                      >
                        Processing
                      </div>
                      <div
                        className={classnames(
                          product.step > 1
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "",
                          "text-center",
                        )}
                      >
                        Shipped
                      </div>
                      <div
                        className={classnames(
                          product.step > 2
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "",
                          "text-right",
                        )}
                      >
                        Delivered
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Billing */}
        <div className="mt-16">
          <h2 className="sr-only">Billing Summary</h2>

          <div className="bg-gray-100 px-4 py-6 sm:rounded-lg sm:px-6 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:px-8 lg:py-8 dark:bg-gray-800">
            <dl className="grid grid-cols-2 gap-6 text-sm sm:grid-cols-2 md:gap-x-8 lg:col-span-7">
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">
                  Billing address
                </dt>
                <dd className="mt-3 text-gray-500 dark:text-gray-400">
                  <span className="block">Floyd Miles</span>
                  <span className="block">7363 Cynthia Pass</span>
                  <span className="block">Toronto, ON N3Y 4H8</span>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-900 dark:text-gray-100">
                  Payment information
                </dt>
                <dd className="-mt-1 -ml-4 flex flex-wrap">
                  <div className="mt-4 ml-4 flex-shrink-0">
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
                  <div className="mt-4 ml-4">
                    <p className="text-gray-900 dark:text-gray-100">
                      Ending with 4242
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Expires 02 / 24
                    </p>
                  </div>
                </dd>
              </div>
            </dl>

            <dl className="mt-8 divide-y divide-gray-200 text-sm lg:col-span-5 lg:mt-0 dark:divide-gray-700">
              <div className="flex items-center justify-between pb-4">
                <dt className="text-gray-600 dark:text-gray-400">Subtotal</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  $72
                </dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="text-gray-600 dark:text-gray-400">Shipping</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  $5
                </dd>
              </div>
              <div className="flex items-center justify-between py-4">
                <dt className="text-gray-600 dark:text-gray-400">Tax</dt>
                <dd className="font-medium text-gray-900 dark:text-gray-100">
                  $6.16
                </dd>
              </div>
              <div className="flex items-center justify-between pt-4">
                <dt className="font-medium text-gray-900 dark:text-gray-100">
                  Order total
                </dt>
                <dd className="font-medium text-indigo-600 dark:text-indigo-400">
                  $83.16
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};
