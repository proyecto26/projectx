import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { expect, describe, it } from 'vitest';
import { CheckoutButton } from './CheckoutButton';

describe('CheckoutButton', () => {
  it('should render successfully', () => {
    const routes = [
      {
        path: '/',
        element: <CheckoutButton />,
        // Add a loader to provide the data router context
        loader: () => ({ message: 'Test Data' }),
        HydrateFallback: () => <div>Loading...</div>
      },
      // Add a checkout route since the button navigates there
      {
        path: '/checkout',
        element: <div>Checkout Page</div>,
        HydrateFallback: () => <div>Loading...</div>
      }
    ];

    const router = createMemoryRouter(routes, {
      initialEntries: ['/'],
      initialIndex: 0
    });

    const { baseElement } = render(
      <RouterProvider router={router} />
    );
    expect(baseElement).toBeTruthy();
  });
});
