import type { LoaderFunction, MetaFunction } from 'react-router';

import { OrderHistory } from '~/pages/OrderHistory';
import { getAccessTokenOrRedirect } from '~/cookies/auth.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'ProjectX - Order History' },
    { name: 'description', content: 'View your order history.' },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  await getAccessTokenOrRedirect(request);
  return {};
};

export default function Index() {
  return (
    <OrderHistory />
  );
}
