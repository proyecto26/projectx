import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClientService } from './client.service';
import { WorkerService, WorkerServiceOptions } from './worker.service';
import { WORKER_OPTIONS_TOKEN } from './constants';

interface WorkerModuleAsyncOptions<T> {
  imports?: Array<Type<unknown> | DynamicModule | Promise<DynamicModule>>;
  useFactory: ((...args: unknown[]) => Promise<WorkerServiceOptions<T>>) | ((arg: T) => Promise<WorkerServiceOptions<T>> | WorkerServiceOptions<T>);
  inject?: Array<Type<unknown> | string | symbol>;
}

@Module({
  controllers: [],
  providers: [ClientService],
  exports: [ClientService],
})
export class WorkflowsModule {
  static registerAsync<T>(
    options: WorkerModuleAsyncOptions<T>
  ): DynamicModule {
    const asyncProviders: Provider[] = [
      {
        provide: WORKER_OPTIONS_TOKEN,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
    ];

    return {
      module: WorkflowsModule,
      imports: [...(options.imports || []), ConfigModule],
      providers: [...asyncProviders, WorkerService],
      exports: [WorkerService],
    };
  }
}
