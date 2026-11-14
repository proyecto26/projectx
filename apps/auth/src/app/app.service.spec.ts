import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { AuthService } from "@projectx/core";
import { ClientService } from "@proyecto26/temporal-workflows";

import { AppService } from "./app.service";

describe("AppService", () => {
  let service: AppService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: ConfigService, useValue: { get: jest.fn(() => "auth") } },
        { provide: ClientService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
