import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestApplicationOptions, ValidationPipe, Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Environment } from '@projectx/models';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

import { setupAppSecurity } from '../security';
import { setupAppSwagger } from '../swagger';

const TRUSTED_IPS = ['127.0.0.1'];

type NestFactoryCreate = [module: Type<unknown>, options?: NestApplicationOptions];

// Avoid TypeScript errors with HMR
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const module: any;

// Track the server instance for proper cleanup during HMR
let currentApp: NestExpressApplication | null = null;
let logger: Logger;
let isShuttingDown = false;

// Helper function to wait for a specified time
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to close the app with grace period
async function closeAppWithGrace(app: NestExpressApplication | null): Promise<void> {
  if (!app) return;
  
  try {
    isShuttingDown = true;
    logger?.log('Gracefully shutting down...');
    await wait(1000); // Give time for connections to drain
    await app.close();
    logger?.log('Application instance closed successfully');
    isShuttingDown = false;
  } catch (err) {
    logger?.error(`Error during graceful shutdown: ${err}`);
    isShuttingDown = false;
  }
}

export async function bootstrapApp<T extends NestExpressApplication>(
  ...params: NestFactoryCreate
) {
  try {
    // Don't start new instance if we're shutting down
    if (isShuttingDown) {
      logger?.log('Application is shutting down, delaying new instance creation');
      await wait(2000);
    }
    
    // Enable logging to buffer
    params[1] = params[1] || {};
    params[1].bufferLogs = true;
    
    // Close previous instance if exists
    if (currentApp) {
      logger?.log('Closing previous application instance due to HMR');
      await closeAppWithGrace(currentApp);
      currentApp = null;
      // Wait additional time to ensure port is released
      await wait(1000);
    }
    
    // Initialize app
    const app = await NestFactory.create<T>(...params);
    currentApp = app;

    logger = app.get(Logger);
    app.useLogger(logger);
    app.useGlobalInterceptors(new LoggerErrorInterceptor());

    const configService = app.get(ConfigService);
    const env = configService.get('app.environment');
    const port = configService.get('app.port');
    const apiPrefix = configService.get('app.apiPrefix');

    app.setGlobalPrefix(apiPrefix, {
      exclude: ['/health'],
    });

    // PARSE HTTP REQUESTS
    app.useBodyParser('urlencoded', { limit: '50mb', extended: true });
    app.useBodyParser('json', { limit: '10mb' });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      })
    );

    // SECURITY
    setupAppSecurity(app);
    logger.log('Security is enabled');

    // Local development
    if (env === Environment.Development) {
      app.enableShutdownHooks();
      logger.log('Shutdown hooks are enabled');
      
      // Check for HMR flag for webpack hot reload
      if (module && module.hot) {
        module.hot.accept();
        module.hot.dispose(async () => {
          logger.log('HMR dispose triggered, cleaning up resources');
          await closeAppWithGrace(currentApp);
        });
        logger.log('Hot Module Replacement (HMR) is enabled');
      }
    }

    // Register the proxy's IP address (load balancer or reverse proxy)
    app.set('trust proxy', function (ip: string) {
      return TRUSTED_IPS.includes(ip);
    });
    logger.log('Trusted IPs are set');

    // Enable Swagger UI
    if (env !== Environment.Production) {
      setupAppSwagger(app);
      logger.log('Swagger is enabled');
    }

    logger.debug(`Starting app on port ${port}, env: ${env}`);
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Application is running on port ${port}`);
    
    return app;
  } catch (error) {
    logger?.error(`Failed to start application, error: ${error}`);
    console.error(`Bootstrap failed: ${error}`);
    throw error;
  }
}
