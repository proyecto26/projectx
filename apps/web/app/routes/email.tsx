import { EmailTemplates, getEmailTemplate } from '@projectx/email';
import { data } from 'react-router';
import invariant from 'tiny-invariant';
import { Route } from './+types/email';

export const loader = ({ params }: Route.LoaderArgs) => {
  invariant(params?.template, 'template is required');
  const html = getEmailTemplate(params.template as unknown as EmailTemplates, {
    token: '123',
    orderId: '123',
    userName: 'John Doe',
  });
  if (!html) {
    return data(null, { status: 404 });
  }
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
      encoding: 'UTF-8',
    },
  });
};
