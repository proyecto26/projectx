import {
  type WorkflowReconnectOptions,
  WorkflowSession,
  type WorkflowSessionCallbacks,
  type WorkflowSessionSnapshot,
} from "./session";
import {
  WORKFLOW_NOT_FOUND,
  type WorkflowClientError,
  type WorkflowTransport,
} from "./types";

/** The part of `localStorage` the registry needs. */
export interface WorkflowStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface WorkflowRegistryOptions<TState, TInput, TResult>
  extends WorkflowSessionCallbacks<TState, TResult> {
  transport: WorkflowTransport<TState, TInput, TResult>;
  isFinal?: (state: TState) => boolean;
  reconnect?: WorkflowReconnectOptions;
  /** Keeps the workflows across reloads. Use one key per user. */
  storage?: WorkflowStorage;
  storageKey?: string;
  /** How long a workflow is kept since its last change, followed or stored. */
  ttlMs?: number;
  /** Reads the id decided by the backend from what `transport.start` returned. */
  resolveId?: (result: TResult) => string | undefined;
  /** Forgets a workflow after `onFinish`. Components showing it keep their state. */
  removeOnFinish?: boolean;
  /** Reads a workflow from the backend, needed by `find`. */
  lookup?: (options: { id: string; signal?: AbortSignal }) => Promise<TState>;
}

type StoredSnapshot<TState, TResult> = Omit<
  WorkflowSessionSnapshot<TState, TResult>,
  "error" | "isCancelling"
>;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STORAGE_KEY = "workflow-client";
const EXPIRATION_CHECK_MS = 60 * 1000;

/**
 * Keeps the workflows of an app, usually one instance per signed in user.
 * Workflows keep being followed when no component is using them.
 */
export class WorkflowRegistry<TState, TInput = unknown, TResult = TState> {
  #options: WorkflowRegistryOptions<TState, TInput, TResult>;
  #sessions = new Map<string, WorkflowSession<TState, TInput, TResult>>();
  #unsubscribes = new Map<string, () => void>();
  #listeners = new Set<() => void>();
  #list: ReadonlyArray<WorkflowSessionSnapshot<TState, TResult>> = [];
  #hydrated = false;
  #aliases = new Map<string, string>();
  #expirationTimer?: ReturnType<typeof setInterval>;

  constructor(options: WorkflowRegistryOptions<TState, TInput, TResult>) {
    this.#options = options;
  }

  /** Gets the session of a workflow, creating it the first time. */
  session(id: string) {
    const key = this.#key(id);
    return this.#sessions.get(key) ?? this.#add(key);
  }

  has(id: string) {
    return this.#sessions.has(this.#key(id));
  }

  /**
   * Looks for a workflow that isn't here, such as a finished one that was removed
   * or one started somewhere else. It follows it if it's still running, and it
   * doesn't fire `onFinish` for one that already ended.
   */
  async find(
    id: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<"found" | "missing"> {
    const { lookup, isFinal, removeOnFinish } = this.#options;
    if (!lookup) throw new Error("WorkflowRegistry.find needs a lookup option");
    const session = this.session(id);
    const current = session.getSnapshot();
    if (
      current.status !== "idle" ||
      current.state !== undefined ||
      current.result !== undefined
    ) {
      return "found";
    }
    let state: TState;
    try {
      state = await lookup({ id: session.id, signal });
    } catch (error) {
      const { status, code } = error as Partial<WorkflowClientError>;
      if (status === 404 || code === WORKFLOW_NOT_FOUND) return "missing";
      throw error;
    }
    const isFinished = isFinal?.(state) ?? false;
    session.restore({ state, status: isFinished ? "finished" : "idle" });
    // Something else started it in the meantime, and it's the one to keep
    if (session.getSnapshot().state !== state) return "found";
    if (!isFinished) session.resume();
    else if (removeOnFinish) this.remove(session.id);
    return "found";
  }

  /** Stops following a workflow and forgets it. The workflow keeps running. */
  remove(id: string) {
    const key = this.#key(id);
    const session = this.#sessions.get(key);
    if (!session) return;
    session.stop();
    this.#unsubscribes.get(key)?.();
    this.#unsubscribes.delete(key);
    this.#sessions.delete(key);
    for (const [alias, target] of this.#aliases) {
      if (target === key) this.#aliases.delete(alias);
    }
    this.#changed();
  }

  /** Snapshots of all the workflows. The array only changes on updates. */
  list = () => this.#list;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** True once `hydrate` ran, so it's known whether a workflow already exists. */
  get isHydrated() {
    return this.#hydrated;
  }

  /**
   * Restores stored workflows and follows the unfinished ones. Finished ones
   * don't fire `onFinish` again. Call it on the client, after the first render,
   * and before starting a workflow that could have been stored.
   * `WorkflowRegistryProvider` does it for you. Nothing is stored until then.
   */
  hydrate() {
    if (!this.#hydrated) {
      this.#hydrated = true;
      const ttlMs = this.#ttlMs;
      const now = Date.now();
      for (const snapshot of this.#read()) {
        const isRemoved =
          snapshot.status === "finished" && this.#options.removeOnFinish;
        if (now - snapshot.updatedAt <= ttlMs && !isRemoved) {
          if (snapshot.requestedId) {
            this.#aliases.set(snapshot.requestedId, snapshot.id);
          }
          this.session(snapshot.id).restore(snapshot);
        }
      }
    }
    this.#expirationTimer ??= setInterval(
      () => this.#removeExpired(),
      Math.min(this.#ttlMs, EXPIRATION_CHECK_MS),
    );
    for (const session of this.#sessions.values()) {
      const { status, state, result } = session.getSnapshot();
      if (
        status !== "finished" &&
        (state !== undefined || result !== undefined)
      ) {
        session.resume();
      }
    }
    this.#changed();
  }

  /** Stops following all the workflows. `hydrate` follows them again. */
  stop() {
    clearInterval(this.#expirationTimer);
    this.#expirationTimer = undefined;
    for (const session of this.#sessions.values()) session.stop();
  }

  get #ttlMs() {
    return this.#options.ttlMs ?? DEFAULT_TTL_MS;
  }

  #key(id: string) {
    return this.#aliases.get(id) ?? id;
  }

  #removeExpired() {
    const now = Date.now();
    for (const [id, session] of this.#sessions) {
      const { status, updatedAt } = session.getSnapshot();
      if (status !== "starting" && now - updatedAt > this.#ttlMs) {
        this.remove(id);
      }
    }
  }

  #attach(session: WorkflowSession<TState, TInput, TResult>) {
    this.#sessions.set(session.id, session);
    this.#unsubscribes.set(
      session.id,
      session.subscribe(() => this.#changed()),
    );
  }

  #add(id: string) {
    const { transport, isFinal, reconnect, onState, resolveId } = this.#options;
    const session = new WorkflowSession<TState, TInput, TResult>({
      id,
      transport,
      isFinal,
      reconnect,
      onState,
      resolveId,
      onFinish: (snapshot) => {
        this.#options.onFinish?.(snapshot);
        if (this.#options.removeOnFinish) this.remove(snapshot.id);
      },
      onError: (error, snapshot) => {
        this.#options.onError?.(error, snapshot);
        // The backend rejected it, so there is nothing to follow
        const { status, state, result } = snapshot;
        if (status === "error" && state === undefined && result === undefined) {
          this.remove(snapshot.id);
        }
      },
      onIdChange: (nextId, previousId) => {
        if (this.#sessions.has(nextId)) return false;
        const unsubscribe = this.#unsubscribes.get(previousId);
        const current = this.#sessions.get(previousId);
        this.#sessions.delete(previousId);
        this.#unsubscribes.delete(previousId);
        if (current && unsubscribe) {
          this.#sessions.set(nextId, current);
          this.#unsubscribes.set(nextId, unsubscribe);
        }
        this.#aliases.set(previousId, nextId);
        return true;
      },
      // A component can retry a session that was removed after being rejected
      onActivate: () => {
        if (!this.#sessions.has(session.id)) this.#attach(session);
      },
    });
    this.#attach(session);
    return session;
  }

  #changed() {
    this.#list = [...this.#sessions.values()].map((s) => s.getSnapshot());
    this.#write();
    for (const listener of this.#listeners) listener();
  }

  #read(): Array<StoredSnapshot<TState, TResult>> {
    const { storage, storageKey = DEFAULT_STORAGE_KEY } = this.#options;
    try {
      const value = storage?.getItem(storageKey);
      const parsed = value ? JSON.parse(value) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  #write() {
    const { storage, storageKey = DEFAULT_STORAGE_KEY } = this.#options;
    if (!storage || !this.#hydrated) return;
    const stored = this.#list
      // Nothing can be resumed if the workflow never got an answer
      .filter(({ status, state, result }) =>
        status === "finished"
          ? !this.#options.removeOnFinish
          : state !== undefined || result !== undefined,
      )
      .map(({ error: _error, isCancelling: _isCancelling, ...rest }) => rest);
    try {
      storage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      // Storage can be full or blocked, the workflows keep working in memory
    }
  }
}
