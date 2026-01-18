import type { ComponentType } from "react";
import { CartProvider } from "react-use-cart";

const CART_ID = "shopping-cart";

export function withCartProvider<T extends object>(
  WrappedComponent: ComponentType<T>,
): ComponentType<T> {
  return (props: T) => (
    <CartProvider id={CART_ID}>
      <WrappedComponent {...props} />
    </CartProvider>
  );
}
