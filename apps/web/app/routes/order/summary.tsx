import type { LoaderFunction, MetaFunction } from 'react-router';

import OrderSummary from '~/pages/OrderSummary';
import { getAccessTokenOrRedirect } from '~/cookies/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'ProjectX - Order Summary' },
    { name: 'description', content: 'View your order summary.' },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await getAccessTokenOrRedirect(request);
  return {};
};

export default function Index() {
  return (
    <OrderSummary />
  );
}
