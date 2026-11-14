import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Connection } from "@temporalio/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClientService, type StartupOptions } from "../src";

vi.mock("@temporalio/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@temporalio/client")>();
  class FakeClient {
    readonly connection: unknown;
    constructor(options: { connection: unknown }) {
      this.connection = options.connection;
    }
  }
  return {
    ...actual,
    Client: FakeClient,
    Connection: { connect: vi.fn() },
  };
});

const connect = vi.mocked(Connection.connect);

function createService(options?: StartupOptions) {
  const config = new ConfigService({
    temporal: { host: "localhost:7233", namespace: "default" },
  });
  return new ClientService(config, {
    startupRetry: { attempts: 3, delayMs: 1 },
    ...options,
  });
}

describe("ClientService", () => {
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    connect.mockReset();
    exit = vi
      .spyOn(process, "exit")
      .mockImplementation((() => undefined) as never);
    for (const method of ["debug", "error", "warn", "fatal"] as const) {
      vi.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("connects, then waits for the connection to close", async () => {
    let closed = false;
    const connection = {
      close: vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        closed = true;
      }),
    };
    connect
      .mockRejectedValueOnce(new Error("not yet"))
      .mockResolvedValueOnce(connection as unknown as Connection);
    const service = createService();

    await service.onModuleInit();
    await service.ready();
    expect(service.getStatus()).toBe("running");
    expect(service.client?.connection).toBe(connection);

    await service.onModuleDestroy();
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(closed).toBe(true);
    expect(service.getStatus()).toBe("stopped");
    expect(exit).not.toHaveBeenCalled();
  });

  it("works without module options", async () => {
    const connection = { close: vi.fn(async () => undefined) };
    connect.mockResolvedValue(connection as unknown as Connection);
    const service = new ClientService(new ConfigService({}));

    await service.onModuleInit();
    await service.ready();
    await service.onModuleDestroy();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  it("fails after the last attempt, logs it and exits", async () => {
    connect.mockRejectedValue(new Error("unreachable"));
    const service = createService();

    await service.onModuleInit();
    await expect(service.ready()).rejects.toThrow("unreachable");
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    expect(connect).toHaveBeenCalledTimes(3);
    expect(service.getStatus()).toBe("failed");
    expect(Logger.prototype.fatal).toHaveBeenCalledWith(
      expect.stringContaining("unreachable"),
      expect.any(String),
    );
  });

  it("keeps the process alive when exitOnStartupFailure is false", async () => {
    connect.mockRejectedValue(new Error("unreachable"));
    const service = createService({ exitOnStartupFailure: false });

    await service.onModuleInit();
    await expect(service.ready()).rejects.toThrow("unreachable");
    expect(service.getStatus()).toBe("failed");
    expect(exit).not.toHaveBeenCalled();
  });

  it("stops retrying when destroyed while waiting to retry", async () => {
    connect.mockRejectedValue(new Error("unreachable"));
    const service = createService({
      startupRetry: { attempts: 5, delayMs: 60_000 },
    });

    await service.onModuleInit();
    await vi.waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    await service.onModuleDestroy();

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(connect).toHaveBeenCalledTimes(1);
    await expect(service.ready()).rejects.toThrow("stopped");
    expect(service.getStatus()).toBe("stopped");
    expect(exit).not.toHaveBeenCalled();
  });

  it("closes a connection that opens after destroy began", async () => {
    const connection = { close: vi.fn(async () => undefined) };
    let finishConnect: (connection: Connection) => void = () => undefined;
    connect.mockReturnValue(
      new Promise<Connection>((resolve) => {
        finishConnect = resolve;
      }),
    );
    const service = createService();

    await service.onModuleInit();
    const destroyed = service.onModuleDestroy();
    finishConnect(connection as unknown as Connection);
    await destroyed;

    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(service.client).toBeUndefined();
    expect(service.getStatus()).toBe("stopped");
  });
});
