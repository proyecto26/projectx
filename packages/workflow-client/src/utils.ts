export const isAbortError = (error: unknown) =>
  (error instanceof Error || error instanceof DOMException) &&
  error.name === "AbortError";

export const abortError = () => new DOMException("Aborted", "AbortError");

/** Waits for the given time, rejecting as soon as the signal aborts. */
export const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
