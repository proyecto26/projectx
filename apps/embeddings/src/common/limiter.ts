export class LimiterFullError extends Error {
  constructor(readonly maxWaiting: number) {
    super(`More than ${maxWaiting} tasks are waiting`);
    this.name = "LimiterFullError";
  }
}

/**
 * At most `concurrency` tasks at a time, first come first served, with at
 * most `maxWaiting` waiters (more are refused with LimiterFullError). A
 * waiter whose signal aborts leaves the queue; a task already running is not
 * interrupted.
 */
export class Limiter {
  private active = 0;
  private readonly queue: { start: () => void; cancel: () => void }[] = [];

  constructor(
    readonly concurrency: number,
    readonly maxWaiting = Number.POSITIVE_INFINITY,
  ) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new RangeError(
        `concurrency must be a positive integer: ${concurrency}`,
      );
    }
  }

  get running(): number {
    return this.active;
  }

  get waiting(): number {
    return this.queue.length;
  }

  async run<T>(task: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    await this.slot(signal);
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.queue.shift()?.start();
    }
  }

  private slot(signal?: AbortSignal): Promise<void> {
    signal?.throwIfAborted();
    if (this.active < this.concurrency) {
      this.active += 1;
      return Promise.resolve();
    }
    if (this.queue.length >= this.maxWaiting) {
      return Promise.reject(new LimiterFullError(this.maxWaiting));
    }
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        const index = this.queue.indexOf(entry);
        if (index >= 0) this.queue.splice(index, 1);
        reject(signal?.reason);
      };
      const entry = {
        start: () => {
          signal?.removeEventListener("abort", onAbort);
          this.active += 1;
          resolve();
        },
        cancel: onAbort,
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.queue.push(entry);
    });
  }
}
