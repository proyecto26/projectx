import path from "node:path";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TestWorkflowEnvironment } from "@temporalio/testing";
import { NativeConnection, Worker } from "@temporalio/worker";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ClientService, WorkerService } from "../src";
import { GreetingActivitiesService } from "./fixtures/activities";
import type { greetingWorkflow } from "./fixtures/workflows";

// Runs against the time-skipping test server, downloaded once by the SDK.
describe("with a Temporal test server", () => {
  let env: TestWorkflowEnvironment;

  beforeAll(async () => {
    for (const method of ["debug", "warn"] as const) {
      vi.spyOn(Logger.prototype, method).mockImplementation(() => undefined);
    }
    env = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await env?.teardown();
    vi.restoreAllMocks();
  });

  it("runs workflows, then shuts the worker down and closes its connection", async () => {
    const shutdown = vi.spyOn(Worker.prototype, "shutdown");
    const close = vi.spyOn(NativeConnection.prototype, "close");
    const config = new ConfigService({
      temporal: { host: env.address, namespace: "default", taskQueue: "test" },
    });
    const service = new WorkerService<Record<string, unknown>>(config, {
      activitiesService: new GreetingActivitiesService() as unknown as Record<
        string,
        unknown
      >,
      workflowsPath: path.join(__dirname, "fixtures/workflows.ts"),
      exitOnStartupFailure: false,
    });

    await service.onModuleInit();
    await service.ready();
    expect(service.getStatus()).toBe("running");

    const result = await env.client.workflow.execute<typeof greetingWorkflow>(
      "greetingWorkflow",
      { taskQueue: "test", workflowId: "greeting-1", args: ["Ada"] },
    );
    expect(result).toBe("Hello, Ada!");

    await service.onModuleDestroy();
    expect(shutdown).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toBe("stopped");
    const worker = (service as unknown as { worker: Worker }).worker;
    expect(worker.getState()).toBe("STOPPED");
  });

  it("connects the client and closes it on destroy", async () => {
    const config = new ConfigService({
      temporal: { host: env.address, namespace: "default" },
    });
    const service = new ClientService(config, { exitOnStartupFailure: false });

    await service.onModuleInit();
    await service.ready();
    expect(service.getStatus()).toBe("running");
    await expect(
      service.client?.workflowService.getSystemInfo({}),
    ).resolves.toBeDefined();

    const close = vi.spyOn(
      service.client?.connection as NonNullable<
        typeof service.client
      >["connection"],
      "close",
    );
    await service.onModuleDestroy();
    expect(close).toHaveBeenCalledTimes(1);
    expect(service.getStatus()).toBe("stopped");
  });
});
