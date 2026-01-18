import { registerAs } from '@nestjs/config';

export default registerAs('swagger', () => ({
  title: 'Order API',
  description: 'Provides the endpoints for order management',
  version: '1.0',
}));
