import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CoreModule, validateConfiguration } from '@projectx/core';
import { DbModule } from '@projectx/db';
import appConfig from '../config/app.config';
import { EnvironmentVariables } from '../config/env.config';
import swaggerConfig from '../config/swagger.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    DbModule,
    CoreModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swaggerConfig],
      validate: (config) => validateConfiguration(config, EnvironmentVariables),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
