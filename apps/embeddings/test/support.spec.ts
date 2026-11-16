import { describe, expect, it } from "vitest";

import { Limiter } from "../src/common/limiter";
import {
  inWindow,
  loadEmbedConfig,
  parseWindow,
} from "../src/config/embed.config";

describe("Limiter", () => {
  it("runs at most `concurrency` tasks and lets an aborted waiter go", async () => {
    const limiter = new Limiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limiter.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((r) => setTimeout(r, 10));
        active -= 1;
      });
    const controller = new AbortController();
    const all = [task(), task(), task()];
    const aborted = limiter.run(async () => "never", controller.signal);
    controller.abort(new Error("gone"));
    await expect(aborted).rejects.toThrow("gone");
    await Promise.all(all);
    expect(peak).toBe(2);
    expect(limiter.waiting).toBe(0);
  });
});

describe("bulk ingestion window", () => {
  const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 15, h, m));

  it("handles windows that wrap past midnight", () => {
    expect(inWindow("22:00-06:00", at(23))).toBe(true);
    expect(inWindow("22:00-06:00", at(5, 59))).toBe(true);
    expect(inWindow("22:00-06:00", at(6))).toBe(false);
    expect(inWindow("01:00-03:00", at(2))).toBe(true);
    expect(inWindow("01:00-03:00", at(3))).toBe(false);
    expect(inWindow(undefined, at(12))).toBe(true);
  });

  it("refuses malformed windows", () => {
    for (const bad of ["22-06", "24:00-01:00", "10:60-11:00", "nightly"]) {
      expect(() => parseWindow(bad)).toThrow("BULK_INGESTION_WINDOW");
    }
  });
});

describe("loadEmbedConfig", () => {
  it("requires a role, the model cache and, for images, Temporal and storage", () => {
    expect(() => loadEmbedConfig({})).toThrow("EMBED_ROLE");
    expect(() => loadEmbedConfig({ EMBED_ROLE: "text" })).toThrow(
      "MODEL_CACHE_DIR",
    );
    expect(() =>
      loadEmbedConfig({ EMBED_ROLE: "image", EMBEDDER: "fake" }),
    ).toThrow("TEMPORAL_HOST");
    const text = loadEmbedConfig({ EMBED_ROLE: "text", EMBEDDER: "fake" });
    expect(text).toMatchObject({ role: "text", port: 8085, threads: 2 });
  });
});
