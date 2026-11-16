#!/usr/bin/env node
// pnpm models:fetch | models:verify — model files for MODEL_CACHE_DIR, checked against models.lock.json
const path = require("node:path");
const { fetchModelFiles, verifyModelFiles } = require("../dist/index.js");
const lock = require("../models.lock.json");

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
