import { createMock } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;
  let appService: AppService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: createMock<AppService>() },
      ],
    }).compile();

    appService = app.get<AppService>(AppService);
  });

  describe('login', () => {
    it('should do something', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.login({ email: 'test@test.com' })).toBeDefined();
      expect(appService.login).toHaveBeenCalled();
    });
  });
});
