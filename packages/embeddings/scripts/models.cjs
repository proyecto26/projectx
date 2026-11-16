#!/usr/bin/env node
// pnpm models:fetch | models:verify — model files for MODEL_CACHE_DIR, checked against models.lock.json
// MODEL_LOCK=reference uses models.reference.lock.json (fp32 graphs for the parity fixtures, never
// fetched for serving)
const path = require("node:path");
const { fetchModelFiles, verifyModelFiles } = require("../dist/index.js");

const locks = {
  serving: "../models.lock.json",
  reference: "../models.reference.lock.json",
};
const lockName = process.env.MODEL_LOCK ?? "serving";
if (!(lockName in locks)) {
  console.error(`MODEL_LOCK must be one of: ${Object.keys(locks).join(", ")}`);
  process.exit(2);
}
const lock = require(locks[lockName]);
const command = process.argv[2];
const cacheDir = process.env.MODEL_CACHE_DIR;
if (!cacheDir) {
  console.error("MODEL_CACHE_DIR is not set");
  process.exit(2);
}
const run =
  command === "fetch"
    ? fetchModelFiles(path.resolve(cacheDir), lock, { log: console.log }).then(
        ({ downloaded }) =>
          console.log(`Model files ready (${downloaded.length} downloaded)`),
      )
    : command === "verify"
      ? verifyModelFiles(path.resolve(cacheDir), lock).then(() =>
          console.log("Model files match the lock"),
        )
      : Promise.reject(new Error("Usage: models.cjs fetch|verify"));
run.catch((error) => {
  console.error(error.message);
  process.exit(1);
});
