import { MinusIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";

type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

const initialCartItems: CartItem[] = [
  {
    id: 1,
    name: "Stylish T-Shirt",
    price: 29.99,
    quantity: 2,
    image: "/placeholder.svg?height=80&width=80",
  },
  {
    id: 2,
    name: "Comfortable Jeans",
    price: 59.99,
    quantity: 1,
    image: "/placeholder.svg?height=80&width=80",
  },
  {
    id: 3,
    name: "Running Shoes",
    price: 89.99,
    quantity: 1,
    image: "/placeholder.svg?height=80&width=80",
  },
];

export function ShoppingCart() {
  const [cartItems, setCartItems] = useState<CartItem[]>(initialCartItems);

  const removeItem = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number, newQuantity: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(1, newQuantity) } : item,
      ),
    );
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = 10;
  const total = subtotal + shipping;

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <h1 className="mb-8 font-bold text-3xl">Shopping Cart</h1>
      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <AnimatePresence>
            {cartItems.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="card card-side mb-4 bg-base-100 shadow-xl"
              >
                <figure className="h-24 w-24">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                </figure>
                <div className="card-body p-4">
                  <h3 className="card-title text-lg">{item.name}</h3>
                  <p className="text-base-content text-opacity-60">
                    ${item.price.toFixed(2)}
                  </p>
                  <div className="mt-2 flex items-center">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="mx-2">{item.quantity}</span>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="card-actions justify-end p-4">
                  <button
                    className="btn btn-ghost btn-circle"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    <TrashIcon className="h-5 w-5 text-error" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cartItems.length === 0 && (
            <div className="alert alert-info">
              <div>
                <span>Your cart is empty</span>
              </div>
            </div>
          )}
        </div>
        <div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Summary</h2>
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
                <button className="btn btn-primary btn-block">
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
