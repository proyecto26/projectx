#!/usr/bin/env node
// Loaded-latency check of the two embedding roles over HTTP (step 3.3, local
// validation; the activation gate is re-run on the deploy target).
//   node loaded-latency.mjs <image files...>
// Env: EMBED_TEXT_URL, EMBED_IMAGE_URL, TEXT_REQUESTS (default 200),
//      IMAGE_LOOPS (default 3: concurrent image queries, below the admission limit of 4)
// Phase 1 measures text queries alone; phase 2 measures them while image
// queries keep embed-image busy. Text latency is end to end (HTTP included).
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const textUrl = process.env.EMBED_TEXT_URL ?? "http://embed-text:8085";
const imageUrl = process.env.EMBED_IMAGE_URL ?? "http://embed-image:8086";
const textRequests = Number(process.env.TEXT_REQUESTS ?? 200);
const imageLoops = Number(process.env.IMAGE_LOOPS ?? 3);
const images = process.argv.slice(2).map((file) => ({
  name: basename(file),
  bytes: readFileSync(file),
}));
if (images.length === 0) throw new Error("Pass at least one image file");

const words = [
  "cordless drill",
  "red ceramic vase",
  "vintage aircraft",
  "glass sea sponge",
  "electric kettle",
  "martillo de carpintero",
  "hard hat",
  "engine piston",
];
const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))],
  );
};
const summary = (values) => ({
  n: values.length,
  p50: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  max: Math.round(Math.max(...values)),
});

async function textQuery(i) {
  const started = performance.now();
  const response = await fetch(`${textUrl}/embed/text`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ texts: [`${words[i % words.length]} ${i}`] }),
  });
  if (!response.ok) throw new Error(`text query answered ${response.status}`);
  await response.json();
  return performance.now() - started;
}

async function textPhase() {
  const latencies = [];
  for (let i = 0; i < textRequests; i++) latencies.push(await textQuery(i));
  return summary(latencies);
}

async function imageQuery(image) {
  const form = new FormData();
  form.append("image", new Blob([image.bytes]), image.name);
  const started = performance.now();
  const response = await fetch(`${imageUrl}/embed/image`, {
    method: "POST",
    body: form,
  });
  await response.arrayBuffer();
  return { status: response.status, ms: performance.now() - started };
}

async function main() {
  for (let i = 0; i < 5; i++) await textQuery(i); // warm-up
  const alone = await textPhase();
  let running = true;
  const imageResults = [];
  const loops = Array.from({ length: imageLoops }, async (_, loop) => {
    for (let i = loop; running; i++) {
      imageResults.push(await imageQuery(images[i % images.length]));
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 5_000)); // let the image lane fill
  const loaded = await textPhase();
  running = false;
  await Promise.all(loops);
  const ok = imageResults.filter((r) => r.status === 200);
  console.log(
    JSON.stringify(
      {
        textAlone: alone,
        textWhileImageQueries: loaded,
        imageQueries: {
          ...summary(ok.map((r) => r.ms)),
          statuses: Object.fromEntries(
            [...new Set(imageResults.map((r) => r.status))].map((s) => [
              s,
              imageResults.filter((r) => r.status === s).length,
            ]),
          ),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
