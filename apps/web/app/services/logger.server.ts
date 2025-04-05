import { createLoggerOptions } from '@projectx/core';
import pino from 'pino';

import { environment } from '~/config/app.config.server';

const loggerOptions = createLoggerOptions('info', 'web', environment);
export const logger = pino(loggerOptions);
