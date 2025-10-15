/** biome-ignore-all lint/a11y/noLabelWithoutControl: Drawer overlay is not a control */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: Drawer overlay is not a control */
import {
  MinusIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import { useId } from "react";
import { useCart } from "react-use-cart";

import { classnames } from "../../utils";
import Button from "../buttons/button/Button";
import CheckoutButton from "../buttons/checkout/CheckoutButton";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type ShoppingCartContentProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShoppingCartContent({
  isOpen,
  onClose,
}: ShoppingCartContentProps) {
  const inputId = useId();
  const { items, updateItemQuantity, removeItem, isEmpty } = useCart();

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * (item.quantity || 1),
    0,
  );
  const shipping = 10.0; // Ejemplo de costo de envío
  const total = subtotal + shipping;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={classnames(
        "drawer drawer-end fixed top-0 right-0 z-[100] w-full max-w-md",
        isOpen ? "drawer-open" : "",
      )}
    >
      <input
        id={inputId}
        type="checkbox"
        className="drawer-toggle"
        checked={isOpen}
        readOnly
      />
      <div className="drawer-side">
        <label htmlFor={inputId} className="drawer-overlay" onClick={onClose} />
        <div className="menu min-h-full w-80 bg-base-200 p-4 text-base-content">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-2xl">Shopping Cart</h2>
            <Button
              variant="ghost"
              className="btn-circle"
              onClick={onClose}
              aria-label="Close shopping cart"
            >
              <XMarkIcon className="h-6 w-6" />
            </Button>
          </div>
          <div className="flex h-full flex-col">
            <div className="flex-grow overflow-y-auto">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="card card-compact mb-4 bg-base-100 shadow-xl"
                  >
                    <figure className="px-4 pt-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="rounded-xl"
                      />
                    </figure>
                    <div className="card-body">
                      <h3 className="card-title text-sm">{item.name}</h3>
                      <p className="text-base-content text-opacity-60">
                        ${item.price.toFixed(2)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <Button
                            className="btn btn-xs btn-outline"
                            onClick={() => {
                              const newQuantity = (item.quantity || 1) - 1;
                              if (newQuantity > 0) {
                                updateItemQuantity(item.id, newQuantity);
                              } else {
                                removeItem(item.id);
                              }
                            }}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            <MinusIcon className="h-3 w-3" />
                          </Button>
                          <span className="mx-2">{item.quantity}</span>
                          <Button
                            className="btn btn-xs btn-outline"
                            onClick={() =>
                              updateItemQuantity(
                                item.id,
                                (item.quantity || 1) + 1,
                              )
                            }
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            <PlusIcon className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          className="btn btn-ghost btn-xs"
                          onClick={() => removeItem(item.id)}
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          <TrashIcon className="h-4 w-4 text-error" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isEmpty && (
                <div className="alert alert-info">
                  <span>Your cart is empty.</span>
                </div>
              )}
            </div>
            <div className="mt-auto pt-4">
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body p-4">
                  <h3 className="card-title text-lg">Summary</h3>
                  <div className="mb-2 flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="mb-2 flex justify-between">
                    <span>Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <div className="divider my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  <div className="card-actions mt-4 justify-end">
                    <CheckoutButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
