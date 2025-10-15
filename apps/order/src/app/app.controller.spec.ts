import { createMock } from "@golevelup/ts-jest";
import { Test, type TestingModule } from "@nestjs/testing";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: createMock<AppService>() }],
    }).compile();
  });

  describe("findAll", () => {
    it("should return something", () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.findAll()).toBeDefined();
    });
  });
});
