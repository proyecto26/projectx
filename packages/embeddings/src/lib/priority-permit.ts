/** Highest priority first */
export const LANES = ["query", "interactive", "bulk"] as const;
export type Lane = (typeof LANES)[number];

/** Releases the permit; calling it again does nothing */
export type Release = () => void;

export class PermitFullError extends Error {
  constructor(readonly lane: Lane) {
    super(`Too many ${lane} requests are waiting`);
    this.name = "PermitFullError";
  }
}

export type PriorityPermitOptions = {
  /**
   * After this many grants to higher lanes while a lower lane waits, the
   * lower lane's oldest waiter goes next, so no lane starves.
   */
  starvationLimit?: number;
  /** Waiters admitted per lane; more are refused with PermitFullError */
  maxWaiting?: Partial<Record<Lane, number>>;
};

type Waiter = {
  lane: Lane;
  grant: (release: Release) => void;
  cleanup: () => void;
};

/**
 * One holder at a time, granted by lane priority with a starvation bound.
 * Used around each single inference, so a high-priority request waits for
 * at most one in-flight item.
 */
export class PriorityPermit {
  private held = false;
  private readonly queues: Record<Lane, Waiter[]> = {
    query: [],
    interactive: [],
    bulk: [],
  };
  /** Grants to higher lanes since this lane last got one, while it waited */
  private readonly passedOver: Record<Lane, number> = {
    query: 0,
    interactive: 0,
    bulk: 0,
  };
  private readonly starvationLimit: number;
  private readonly maxWaiting: Record<Lane, number>;

  constructor(options: PriorityPermitOptions = {}) {
    this.starvationLimit = options.starvationLimit ?? 20;
    this.maxWaiting = {
      query: options.maxWaiting?.query ?? 4,
      interactive: options.maxWaiting?.interactive ?? Number.POSITIVE_INFINITY,
      bulk: options.maxWaiting?.bulk ?? Number.POSITIVE_INFINITY,
    };
  }

  /** Whether someone holds the permit */
  get busy(): boolean {
    return this.held;
  }

  waiting(lane?: Lane): number {
    if (lane) return this.queues[lane].length;
    return LANES.reduce((sum, l) => sum + this.queues[l].length, 0);
  }

  /**
   * Waits for the permit. Rejects with the signal's reason if it aborts
   * before the permit is granted (the waiter is removed), and with
   * PermitFullError if the lane's queue is full.
   */
  acquire(lane: Lane, signal?: AbortSignal): Promise<Release> {
    if (signal?.aborted) return Promise.reject(abortReason(signal));
    if (!this.held && this.waiting() === 0) {
      this.held = true;
      return Promise.resolve(this.releaser());
    }
    if (this.queues[lane].length >= this.maxWaiting[lane]) {
      return Promise.reject(new PermitFullError(lane));
    }
    return new Promise<Release>((resolve, reject) => {
      const onAbort = () => {
        const queue = this.queues[lane];
        const index = queue.indexOf(waiter);
        if (index >= 0) queue.splice(index, 1);
        reject(abortReason(signal as AbortSignal));
      };
      const waiter: Waiter = {
        lane,
        grant: resolve,
        cleanup: () => signal?.removeEventListener("abort", onAbort),
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      this.queues[lane].push(waiter);
      if (!this.held) this.next();
    });
  }

  private releaser(): Release {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.held = false;
      this.next();
    };
  }

  private next() {
    const lane = this.pickLane();
    if (!lane) return;
    const waiter = this.queues[lane].shift() as Waiter;
    waiter.cleanup();
    this.passedOver[lane] = 0;
    for (const lower of LANES.slice(LANES.indexOf(lane) + 1)) {
      if (this.queues[lower].length > 0) this.passedOver[lower] += 1;
    }
    this.held = true;
    waiter.grant(this.releaser());
  }

  private pickLane(): Lane | undefined {
    // A starved lane goes first (the higher one if several are starved)
    const starved = LANES.find(
      (lane) =>
        this.queues[lane].length > 0 &&
        this.passedOver[lane] >= this.starvationLimit,
    );
    return starved ?? LANES.find((lane) => this.queues[lane].length > 0);
  }
}

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("Aborted", "AbortError");
}
