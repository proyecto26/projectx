import {
  BadRequestException,
  GatewayTimeoutException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import {
  FakeEmbedder,
  ImageDecodeError,
  PriorityPermit,
} from "@projectx/embeddings";
import { describe, expect, it } from "vitest";

import type { ProfileService } from "../src/embedder/profile.service";
import { ImageController } from "../src/image/image.controller";
import {
  MAX_TEXT_BYTES,
  MAX_TEXT_WAITING,
  MAX_TEXTS,
  TextController,
} from "../src/text/text.controller";

const profile = { profileId: 3, registered: true } as ProfileService;
const image = (bytes = [1, 2, 3]) => ({
  buffer: Buffer.from(bytes),
  size: bytes.length,
});

describe("POST /embed/text", () => {
  const controller = new TextController(new FakeEmbedder(), profile);

  it("returns one unit vector per text with the profile id", async () => {
    const response = await controller.embedText({
      texts: ["red vase", "drill"],
    });
    expect(response.vectors).toHaveLength(2);
    expect(response.vectors[0]).toHaveLength(768);
    expect(response.profileId).toBe(3);
  });

  it.each([
    [{}],
    [{ texts: [] }],
    [{ texts: Array(MAX_TEXTS + 1).fill("a") }],
    [{ texts: [""] }],
    [{ texts: [42] }],
    [{ texts: ["é".repeat(MAX_TEXT_BYTES)] }],
  ])("refuses %j", async (body) => {
    await expect(controller.embedText(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("POST /embed/image", () => {
  it("embeds an image on the query lane", async () => {
    const controller = new ImageController(
      new FakeEmbedder(),
      new PriorityPermit(),
      profile,
    );
    const response = await controller.embedImage(image(), {});
    expect(response.vector).toHaveLength(768);
    expect(response.profileId).toBe(3);
  });

  it("answers 503 when the query lane is full", async () => {
    const permit = new PriorityPermit({ maxWaiting: { query: 1 } });
    const release = await permit.acquire("bulk");
    const controller = new ImageController(new FakeEmbedder(), permit, profile);
    const waiting = controller.embedImage(image(), {});
    await expect(controller.embedImage(image(), {})).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    release();
    await expect(waiting).resolves.toBeDefined();
  });

  it("answers 504 when the permit isn't granted before the deadline", async () => {
    const permit = new PriorityPermit();
    const release = await permit.acquire("bulk");
    const controller = new ImageController(new FakeEmbedder(), permit, profile);
    controller.deadlineMs = 30;
    await expect(controller.embedImage(image(), {})).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    // The waiter left the queue
    expect(permit.waiting("query")).toBe(0);
    release();
  });

  it("discards an inference that finished after the deadline", async () => {
    const slow = new FakeEmbedder({
      onImage: () => new Promise((r) => setTimeout(r, 60)),
    });
    const controller = new ImageController(slow, new PriorityPermit(), profile);
    controller.deadlineMs = 20;
    await expect(controller.embedImage(image(), {})).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });

  it("answers 422 for bytes that are not an image and 400 without a file", async () => {
    const broken = new FakeEmbedder({
      onImage: () => {
        throw new ImageDecodeError("nope");
      },
    });
    const permit = new PriorityPermit();
    const controller = new ImageController(broken, permit, profile);
    await expect(controller.embedImage(image(), {})).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(permit.busy).toBe(false);
    await expect(controller.embedImage(undefined, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe("POST /embed/text admission", () => {
  const slowEmbedder = (ms: number) => {
    const embedder = new FakeEmbedder();
    const original = embedder.embedQueries.bind(embedder);
    embedder.embedQueries = async (texts) => {
      await new Promise((r) => setTimeout(r, ms));
      return original(texts);
    };
    return embedder;
  };

  it("answers 503 once the queue is full", async () => {
    const controller = new TextController(slowEmbedder(50), profile);
    const running = controller.embedText({ texts: ["a"] });
    const waiting = Array.from({ length: MAX_TEXT_WAITING }, () =>
      controller.embedText({ texts: ["b"] }),
    );
    await expect(controller.embedText({ texts: ["c"] })).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await Promise.all([running, ...waiting]);
  });

  it("answers 504 past the deadline, also for an inference that finished late", async () => {
    const controller = new TextController(slowEmbedder(60), profile);
    controller.deadlineMs = 20;
    await expect(
      controller.embedText({ texts: ["late"] }),
    ).rejects.toBeInstanceOf(GatewayTimeoutException);
  });

  it("leaves the queue when the client goes away", async () => {
    const controller = new TextController(slowEmbedder(80), profile);
    const running = controller.embedText({ texts: ["a"] });
    const listeners: (() => void)[] = [];
    const response = {
      writableFinished: false,
      once: (_: "close", l: () => void) => listeners.push(l),
    };
    const waiting = controller
      .embedText({ texts: ["b"] }, response)
      .catch((e: unknown) => e);
    for (const listener of listeners) listener();
    expect(String(await waiting)).toContain("went away");
    await running;
  });
});
