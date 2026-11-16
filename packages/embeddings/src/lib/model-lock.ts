import lock from "../../models.lock.json";

import type { ModelLock } from "./model-files";

/** The pinned model files (models.lock.json), bundled into the build */
export const MODEL_LOCK: ModelLock = lock;
