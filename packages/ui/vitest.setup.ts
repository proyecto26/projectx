import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Use real react-router/react-router-dom implementations in tests

// Mock cart library used by drawer/checkout components
vi.mock("react-use-cart", () => ({
  useCart: () => ({
    items: [],
    totalItems: 0,
    cartTotal: 0,
    isEmpty: true,
    addItem: () => {},
    updateItemQuantity: () => {},
    removeItem: () => {},
    emptyCart: () => {},
  }),
}));

// Mock toast notifications
vi.mock("react-toastify", () => ({
  toast: { success: () => {}, error: () => {} },
}));

// Some components import client-only; mock as identity
vi.mock("remix-utils/client-only", () => ({
  ClientOnly: ({ children }) =>
    typeof children === "function" ? children() : children,
}));
