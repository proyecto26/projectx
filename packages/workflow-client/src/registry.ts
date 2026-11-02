import {
  type WorkflowReconnectOptions,
  WorkflowSession,
  type WorkflowSessionCallbacks,
  type WorkflowSessionSnapshot,
} from "./session";
import type { WorkflowTransport } from "./types";

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
  /** How long a stored workflow is kept since its last change. */
  ttlMs?: number;
}

type StoredSnapshot<TState, TResult> = Omit<
  WorkflowSessionSnapshot<TState, TResult>,
  "error" | "isCancelling"
>;

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_STORAGE_KEY = "workflow-client";

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

  constructor(options: WorkflowRegistryOptions<TState, TInput, TResult>) {
    this.#options = options;
  }

  /** Gets the session of a workflow, creating it the first time. */
  session(id: string) {
    return this.#sessions.get(id) ?? this.#add(id);
  }

  has(id: string) {
    return this.#sessions.has(id);
  }

  /** Stops following a workflow and forgets it. The workflow keeps running. */
  remove(id: string) {
    const session = this.#sessions.get(id);
    if (!session) return;
    session.stop();
    this.#unsubscribes.get(id)?.();
    this.#unsubscribes.delete(id);
    this.#sessions.delete(id);
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
      const ttlMs = this.#options.ttlMs ?? DEFAULT_TTL_MS;
      const now = Date.now();
      for (const snapshot of this.#read()) {
        if (now - snapshot.updatedAt <= ttlMs) {
          this.session(snapshot.id).restore(snapshot);
        }
      }
    }
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
    for (const session of this.#sessions.values()) session.stop();
  }

  #add(id: string) {
    const { transport, isFinal, reconnect, onState, onFinish, onError } =
      this.#options;
    const session = new WorkflowSession<TState, TInput, TResult>({
      id,
      transport,
      isFinal,
      reconnect,
      onState,
      onFinish,
      onError,
    });
    this.#sessions.set(id, session);
    this.#unsubscribes.set(
      id,
      session.subscribe(() => this.#changed()),
    );
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
      .filter(
        ({ status, state, result }) =>
          status === "finished" || state !== undefined || result !== undefined,
      )
      .map(({ error: _error, isCancelling: _isCancelling, ...rest }) => rest);
    try {
      storage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      // Storage can be full or blocked, the workflows keep working in memory
    }
  }
}
