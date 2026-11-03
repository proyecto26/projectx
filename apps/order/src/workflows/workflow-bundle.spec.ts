import { readFileSync } from "node:fs";
import path from "node:path";
import { historyFromJSON } from "@temporalio/common/lib/proto-utils";
import { bundleWorkflowCode, Worker } from "@temporalio/worker";

const logger = {
  log: () => undefined,
  trace: () => undefined,
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe("order workflow bundle", () => {
  let code: string;

  beforeAll(async () => {
    ({ code } = await bundleWorkflowCode({
      workflowsPath: path.join(__dirname, "index.ts"),
      logger,
    }));
  }, 120_000);

  // Workflows run in a sandbox: importing a barrel from a workflow pulls NestJS in
  it.each([
    "@nestjs",
    "class-validator",
    "class-transformer",
    "rxjs",
  ])("doesn't include %s", (name) => {
    expect(code).not.toContain(name);
  });

  it("replays a completed order with the current code", async () => {
    const history = historyFromJSON(
      JSON.parse(
        readFileSync(
          path.join(__dirname, "__fixtures__/order-state-stream.history.json"),
          "utf8",
        ),
      ),
    );
    await expect(
      Worker.runReplayHistory({ workflowBundle: { code } }, history),
    ).resolves.toBeUndefined();
  }, 60_000);
});
