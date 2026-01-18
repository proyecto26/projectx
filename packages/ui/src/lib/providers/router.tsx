import type { ComponentType } from "react";
import {
  createMemoryRouter,
  type RouteObject,
  RouterProvider,
} from "react-router-dom";

export function withRouterProvider<T extends object>(
  WrappedComponent: ComponentType<T>,
): ComponentType<T> {
  return (props: T) => {
    const routes: RouteObject[] = [
      {
        path: "/",
        element: <WrappedComponent {...props} />,
      },
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ["/"], // You can set the initial route here
    });

    return <RouterProvider router={router} />;
  };
}
