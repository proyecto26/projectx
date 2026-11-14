import {
  type DynamicModule,
  Module,
  type Provider,
  type Type,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ClientService } from "./client.service";
import { WORKER_OPTIONS_TOKEN } from "./constants";
import { WorkerService, type WorkerServiceOptions } from "./worker.service";

interface WorkerModuleAsyncOptions<T> {
  imports?: Array<Type<unknown> | DynamicModule | Promise<DynamicModule>>;
  useFactory:
    | ((...args: unknown[]) => Promise<WorkerServiceOptions<T>>)
    | ((arg: T) => Promise<WorkerServiceOptions<T>> | WorkerServiceOptions<T>);
  inject?: Array<Type<unknown> | string | symbol>;
}

@Module({
  controllers: [],
  providers: [ClientService],
  exports: [ClientService],
})
// biome-ignore lint/complexity/noStaticOnlyClass: This is a standard NestJS pattern for dynamic modules.
export class WorkflowsModule {
  static registerAsync<T>(options: WorkerModuleAsyncOptions<T>): DynamicModule {
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
