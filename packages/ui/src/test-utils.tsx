import { type RenderOptions, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { createRoutesStub } from "react-router";

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  path?: string;
  action?: () => unknown;
  loader?: () => unknown;
  routes?: Array<{
    path: string;
    element: ReactElement;
    action?: () => unknown;
    loader?: () => unknown;
  }>;
  hydrateFallback?: ReactElement;
}

export function renderWithRouter(
  ui: ReactElement,
  {
    initialEntries = ["/"],
    path = "/",
    action,
    loader,
    routes = [],
    hydrateFallback = <div>Loading...</div>,
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  const allRoutes = [
    {
      path,
      Component: () => ui,
      action,
      loader,
      HydrateFallback: () => hydrateFallback,
    },
    ...routes.map((route) => ({
      ...route,
      HydrateFallback: () => hydrateFallback,
    })),
  ];

  const Stub = createRoutesStub(allRoutes);

  return {
    ...render(<Stub initialEntries={initialEntries} />, renderOptions),
  };
}

// Re-export everything
export * from "@testing-library/react";
