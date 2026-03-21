import { ShoppingCartIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "react-use-cart";
import { ClientOnly } from "remix-utils/client-only";

import Button from "../buttons/button/Button";
import { ShoppingCartContent } from "./ShoppingCartContent";

export function ShoppingCartDrawer() {
  const { totalItems } = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen((prevState) => !prevState);
  };

  const sharedContent = (
    <ShoppingCartContent
      key="shopping-cart-content"
      isOpen={isDrawerOpen}
      onClose={() => setIsDrawerOpen(false)}
    />
  );

  return (
    <>
      <Button
        variant="ghost"
        className="btn-circle relative"
        onClick={toggleDrawer}
      >
        <ShoppingCartIcon className="h-6 w-6" />
        {totalItems > 0 && (
          <span className="absolute -top-1 -right-1 flex aspect-square h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] p-0 font-bold text-[10px] text-white leading-none">
            {totalItems}
          </span>
        )}
      </Button>

      <ClientOnly fallback={sharedContent}>
        {() => createPortal(sharedContent, document.body)}
      </ClientOnly>
    </>
  );
}
