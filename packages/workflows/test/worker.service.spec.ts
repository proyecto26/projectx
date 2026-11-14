import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NativeConnection, Worker } from "@temporalio/worker";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkerService, type WorkerServiceOptions } from "../src";
import { GreetingActivitiesService } from "./fixtures/activities";

vi.mock("@temporalio/worker", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@temporalio/worker")>();
  return {
    ...actual,
    Runtime: { install: vi.fn() },
    Worker: { create: vi.fn() },
    NativeConnection: { connect: vi.fn() },
  };
});

const connect = vi.mocked(NativeConnection.connect);
const create = vi.mocked(Worker.create);

type Events = string[];

function fakeConnection(events: Events, id: number) {
  return {
    id,
    close: vi.fn(async () => {
      events.push(`close:${id}`);
    }),
  };
}

function fakeWorker(events: Events) {
  let state = "INITIALIZED";
  let stop: () => void = () => undefined;
  const stopped = new Promise<void>((resolve) => {
    stop = resolve;
  });
  return {
    getState: () => state,
    run: vi.fn(async () => {
      state = "RUNNING";
      events.push("run");
      await stopped;
      state = "STOPPED";
      events.push("run:done");
    }),
    shutdown: vi.fn(() => {
      if (state !== "RUNNING") throw new Error(`Not running: ${state}`);
      state = "DRAINING";
      events.push("shutdown");
      // Draining takes a moment, so a destroy that doesn't wait would close
      // the connection first.
      setTimeout(stop, 20);
    }),
  };
}

type FakeWorker = ReturnType<typeof fakeWorker>;
type FakeConnection = ReturnType<typeof fakeConnection>;

const asWorker = (worker: FakeWorker) => worker as unknown as Worker;
const asConnection = (connection: FakeConnection) =>
  connection as unknown as NativeConnection;

function createService(
  options: Partial<WorkerServiceOptions<Record<string, unknown>>> = {},
) {
  const config = new ConfigService({
    temporal: { host: "localhost:7233", namespace: "default", taskQueue: "q" },
  });
  return new WorkerService<Record<string, unknown>>(config, {
    activitiesService: new GreetingActivitiesService() as unknown as Record<
      string,
      unknown
    >,
    workflowBundle: { code: "" },
    startupRetry: { attempts: 3, delayMs: 1 },
    ...options,
  });
}

describe("WorkerService", () => {
  let exit: ReturnType<typeof vi.spyOn>;
  let events: Events;
  let connections: FakeConnection[];

  beforeEach(() => {
    events = [];
    connections = [];
    connect.mockReset();
    create.mockReset();
    connect.mockImplementation(async () => {
      const connection = fakeConnection(events, connections.length + 1);
      connections.push(connection);
      return asConnection(connection);
    });
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

  it("starts, then shuts down the worker and closes its connection", async () => {
    const worker = fakeWorker(events);
    create.mockResolvedValue(asWorker(worker));
    const service = createService();

    expect(service.getStatus()).toBe("starting");
    await service.onModuleInit();
    await service.ready();
    expect(service.getStatus()).toBe("running");
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        connection: connections[0],
        namespace: "default",
        taskQueue: "q",
        activities: expect.objectContaining({ greet: expect.any(Function) }),
      }),
    );

    // Activities are bound to the service instance.
    const { activities } = create.mock.calls[0][0];
    const greet = (activities as Record<string, (name: string) => unknown>)
      .greet;
    await expect(greet("Ada")).resolves.toBe("Hello, Ada!");
    expect(Object.keys(activities ?? {})).not.toContain("constructor");

    await service.onModuleDestroy();

    expect(worker.shutdown).toHaveBeenCalledTimes(1);
    expect(connections[0].close).toHaveBeenCalledTimes(1);
    // The connection is closed only after the worker has drained.
    expect(events).toEqual(["run", "shutdown", "run:done", "close:1"]);
    expect(service.getStatus()).toBe("stopped");
    expect(exit).not.toHaveBeenCalled();
  });

  it("closes the connection of every failed attempt", async () => {
    const worker = fakeWorker(events);
    create
      .mockRejectedValueOnce(new Error("namespace not found"))
      .mockRejectedValueOnce(new Error("namespace not found"))
      .mockResolvedValueOnce(asWorker(worker));
    const service = createService();

    await service.onModuleInit();
    await service.ready();

    expect(connect).toHaveBeenCalledTimes(3);
    expect(connections[0].close).toHaveBeenCalledTimes(1);
    expect(connections[1].close).toHaveBeenCalledTimes(1);
    expect(connections[2].close).not.toHaveBeenCalled();

    await service.onModuleDestroy();
    expect(connections[2].close).toHaveBeenCalledTimes(1);
  });

  it("fails after the last attempt, logs it and exits", async () => {
    create.mockRejectedValue(new Error("unreachable"));
    const fatal = vi.mocked(Logger.prototype.fatal);
    const service = createService();

    await service.onModuleInit();
    await expect(service.ready()).rejects.toThrow("unreachable");
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));

    expect(service.getStatus()).toBe("failed");
    expect(create).toHaveBeenCalledTimes(3);
    expect(fatal).toHaveBeenCalledWith(
      expect.stringContaining("unreachable"),
      expect.any(String),
    );
    for (const connection of connections) {
      expect(connection.close).toHaveBeenCalledTimes(1);
    }

    await service.onModuleDestroy();
    expect(service.getStatus()).toBe("failed");
  });

  it("keeps the process alive when exitOnStartupFailure is false", async () => {
    connect.mockRejectedValue(new Error("unreachable"));
    const service = createService({ exitOnStartupFailure: false });

    await service.onModuleInit();
    await expect(service.ready()).rejects.toThrow("unreachable");

    expect(service.getStatus()).toBe("failed");
    expect(connect).toHaveBeenCalledTimes(3);
    expect(exit).not.toHaveBeenCalled();
  });

  it("stops retrying when destroyed while waiting to retry", async () => {
    connect.mockRejectedValue(new Error("unreachable"));
    const service = createService({
      startupRetry: { attempts: 5, delayMs: 60_000 },
    });

    await service.onModuleInit();
    await vi.waitFor(() => expect(connect).toHaveBeenCalledTimes(1));

    const started = Date.now();
    await service.onModuleDestroy();
    // The 60 second delay is cancelled.
    expect(Date.now() - started).toBeLessThan(1000);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(connect).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    await expect(service.ready()).rejects.toThrow("stopped");
    expect(service.getStatus()).toBe("stopped");
    expect(exit).not.toHaveBeenCalled();
  });

  it("shuts down a worker created after destroy began", async () => {
    const worker = fakeWorker(events);
    let finishCreate: (worker: Worker) => void = () => undefined;
    create.mockReturnValue(
      new Promise<Worker>((resolve) => {
        finishCreate = resolve;
      }),
    );
    const service = createService();

    await service.onModuleInit();
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(1));

    const destroyed = service.onModuleDestroy();
    finishCreate(asWorker(worker));
    await destroyed;

    expect(events).toEqual(["run", "shutdown", "run:done", "close:1"]);
    await expect(service.ready()).rejects.toThrow("stopped");
    expect(service.getStatus()).toBe("stopped");
    expect(exit).not.toHaveBeenCalled();
  });

  it("reports a worker that stops with an error", async () => {
    let crash: (error: Error) => void = () => undefined;
    const worker = {
      getState: () => "RUNNING",
      shutdown: vi.fn(),
      run: vi.fn(
        () =>
          new Promise<void>((_, reject) => {
            crash = reject;
          }),
      ),
    };
    create.mockResolvedValue(worker as unknown as Worker);
    const service = createService();

    await service.onModuleInit();
    await service.ready();
    crash(new Error("lost the server"));

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(service.getStatus()).toBe("failed");
    expect(connections[0].close).toHaveBeenCalledTimes(1);
  });
});
