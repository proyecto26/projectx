// The parity inputs (test/fixtures/parity-inputs.json): images are fetched from
// commit-pinned URLs and must match their recorded sha256, so the generator and
// the test always embed the same bytes.
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const INPUTS_FILE = path.join(__dirname, "../test/fixtures/parity-inputs.json");

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function loadParityInputs(file = INPUTS_FILE) {
  const raw = readFileSync(file);
  const spec = JSON.parse(raw.toString("utf8"));
  const images = new Map();
  for (const image of spec.images) {
    const response = await fetch(image.url);
    if (!response.ok)
      throw new Error(`GET ${image.url} answered ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (sha256(bytes) !== image.sha256) {
      throw new Error(`${image.id} doesn't match its recorded sha256`);
    }
    images.set(image.id, bytes);
  }
  for (const item of spec.mixed) {
    if (!images.has(item.image)) throw new Error(`Unknown image ${item.image}`);
  }
  return {
    inputsSha256: sha256(raw),
    queries: spec.queries,
    images,
    mixed: spec.mixed,
  };
}

module.exports = { INPUTS_FILE, loadParityInputs, sha256 };
