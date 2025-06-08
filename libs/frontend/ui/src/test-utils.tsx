import { ReactElement } from 'react';
import { createRoutesStub } from 'react-router';
import { render, RenderOptions } from '@testing-library/react';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  path?: string;
  action?: () => any;
  loader?: () => any;
  routes?: Array<{
    path: string;
    element: ReactElement;
    action?: () => any;
    loader?: () => any;
  }>;
  hydrateFallback?: ReactElement;
}

export function renderWithRouter(
  ui: ReactElement,
  {
    initialEntries = ['/'],
    path = '/',
    action,
    loader,
    routes = [],
    hydrateFallback = <div>Loading...</div>,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const allRoutes = [
    {
      path,
      Component: () => ui,
      action,
      loader,
      HydrateFallback: () => hydrateFallback,
    },
    ...routes.map(route => ({
      ...route,
      HydrateFallback: () => hydrateFallback,
    }))
  ];

  const Stub = createRoutesStub(allRoutes);

  return {
    ...render(<Stub initialEntries={initialEntries} />, renderOptions),
  };
}

// Re-export everything
export * from '@testing-library/react'; 