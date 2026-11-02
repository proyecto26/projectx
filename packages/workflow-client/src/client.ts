import { WorkflowRegistry, type WorkflowStorage } from "./registry";
import type {
  WorkflowReconnectOptions,
  WorkflowSession,
  WorkflowSessionSnapshot,
} from "./session";
import { createStreamLimiter, type StreamLimiter } from "./transports/limited";
import type { WorkflowTransport } from "./types";

/** A snapshot read from a client, which always knows its workflow type. */
export type WorkflowSnapshot<
  TState = unknown,
  TResult = TState,
> = WorkflowSessionSnapshot<TState, TResult> & { readonly type: string };

/**
 * Written with methods on purpose: their parameters are bivariant, which lets a
 * client hold definitions of different types in one list as `unknown`.
 */
export interface WorkflowDefinition<
  TState,
  TInput = unknown,
  TResult = TState,
  TContext = unknown,
> {
  /** Identifies this kind of workflow, unique in a client. */
  type: string;
  /** How it talks to the backend, or a function building it for each client. */
  transport:
    | WorkflowTransport<TState, TInput, TResult>
    | ((options: {
        context: TContext;
        /** Counts the open streams of all the workflow types of the client. */
        limiter: StreamLimiter;
      }) => WorkflowTransport<TState, TInput, TResult>);
  /** Business states that end the workflow while the execution may still run. */
  isFinal?(state: TState): boolean;
  reconnect?: WorkflowReconnectOptions;
  /** How long a workflow is kept since its last change, followed or stored. */
  ttlMs?: number;
  /** Reads the id decided by the backend from what `transport.start` returned. */
  resolveId?(result: TResult): string | undefined;
  /** Forgets a workflow after `onFinish`. Components showing it keep their state. */
  removeOnFinish?: boolean;
  /**
   * Forgets a workflow the backend rejected when starting, keeping the error in
   * the components using it. `true` by default. With `false` it stays until you
   * remove it, so another view can read the error. It's never stored.
   */
  removeOnReject?: boolean;
  /** Reads a workflow from the backend, needed by `client.find`. */
  lookup?: (options: {
    id: string;
    signal?: AbortSignal;
    context: TContext;
  }) => Promise<TState>;
  onState?(snapshot: WorkflowSessionSnapshot<TState, TResult>): void;
  /** Fires when the workflow finishes while it's being followed. */
  onFinish?(snapshot: WorkflowSessionSnapshot<TState, TResult>): void;
  onError?(
    error: Error,
    snapshot: WorkflowSessionSnapshot<TState, TResult>,
    helpers: {
      /** Stops following this workflow and forgets it. */
      remove: () => void;
    },
  ): void;
}

/**
 * Describes a kind of workflow. It returns what it gets, and only exists to
 * carry the types to the client and the hooks, as `queryOptions` does.
 */
export function defineWorkflow<
  TState,
  TInput = unknown,
  TResult = TState,
  TContext = unknown,
>(definition: WorkflowDefinition<TState, TInput, TResult, TContext>) {
  return definition;
}

type StoredRegistry = WorkflowRegistry<unknown, unknown, unknown>;

/**
 * A definition with any context, for what doesn't read it. Only functions receive
 * the context, so `never` accepts them all.
 */
export type WorkflowDefinitionOf<TState, TInput, TResult> = WorkflowDefinition<
  TState,
  TInput,
  TResult,
  never
>;

export interface WorkflowClientOptions<TContext> {
  /** Every kind of workflow, needed to restore the stored ones of each. */
  workflows: ReadonlyArray<
    WorkflowDefinition<unknown, unknown, unknown, TContext>
  >;
  /** What the definitions need from the app, such as how to read the token. */
  context?: TContext;
  /** Keeps the workflows across reloads. */
  storage?: WorkflowStorage;
  /** Prefix of the stored keys, one per workflow type. Use one per user. */
  storageKey?: string;
  /** Streams open at once, counting all the workflow types. 4 by default. */
  maxStreams?: number;
}

export interface WorkflowListFilter<TSnapshot> {
  /** Only the workflows of this type. */
  type?: string;
  predicate?: (snapshot: TSnapshot) => boolean;
}

/**
 * Keeps all the workflows of an app, usually one instance per signed in user.
 * Workflows keep being followed when no component is using them.
 */
export class WorkflowClient<TContext = unknown> {
  #registries = new Map<string, StoredRegistry>();
  #listeners = new Set<() => void>();
  #list: ReadonlyArray<WorkflowSnapshot> = [];

  constructor({
    workflows,
    context,
    storage,
    storageKey = "workflows",
    maxStreams,
  }: WorkflowClientOptions<TContext>) {
    const limiter = createStreamLimiter({ maxStreams });
    for (const definition of workflows) {
      const { type, transport, lookup, onError } = definition;
      if (this.#registries.has(type)) {
        throw new Error(`The workflow type "${type}" is defined twice`);
      }
      const registry: StoredRegistry = new WorkflowRegistry({
        ...definition,
        transport:
          typeof transport === "function"
            ? transport({ context: context as TContext, limiter })
            : transport,
        storage,
        storageKey: `${storageKey}:${type}`,
        lookup:
          lookup &&
          ((options) => lookup({ ...options, context: context as TContext })),
        onError:
          onError &&
          ((error, snapshot) =>
            onError(error, snapshot, {
              remove: () => registry.remove(snapshot.id),
            })),
      });
      registry.subscribe(() => this.#changed());
      this.#registries.set(type, registry);
    }
  }

  /** Gets the session of a workflow, creating it the first time. */
  session<TState, TInput, TResult>(
    workflow: WorkflowDefinitionOf<TState, TInput, TResult>,
    id: string,
  ) {
    return this.#registry(workflow).session(id) as unknown as WorkflowSession<
      TState,
      TInput,
      TResult
    >;
  }

  has<TState, TInput, TResult>(
    workflow: WorkflowDefinitionOf<TState, TInput, TResult>,
    id: string,
  ) {
    return this.#registry(workflow).has(id);
  }

  /**
   * Looks for a workflow that isn't here, such as a finished one that was removed
   * or one started somewhere else. It follows it if it's still running, and it
   * doesn't fire `onFinish` for one that already ended.
   */
  find<TState, TInput, TResult>(
    workflow: WorkflowDefinitionOf<TState, TInput, TResult>,
    id: string,
    options?: { signal?: AbortSignal },
  ): Promise<"found" | "missing"> {
    return this.#registry(workflow).find(id, options);
  }

  /** Stops following a workflow and forgets it. The workflow keeps running. */
  remove<TState, TInput, TResult>(
    workflow: WorkflowDefinitionOf<TState, TInput, TResult>,
    id: string,
  ) {
    this.#registry(workflow).remove(id);
  }

  /** Snapshots of the workflows. Without a filter, the array only changes on updates. */
  list<TState, TInput, TResult>(
    filter: { workflow: WorkflowDefinitionOf<TState, TInput, TResult> } & Pick<
      WorkflowListFilter<WorkflowSnapshot<TState, TResult>>,
      "predicate"
    >,
  ): ReadonlyArray<WorkflowSnapshot<TState, TResult>>;
  list(
    filter?: WorkflowListFilter<WorkflowSnapshot>,
  ): ReadonlyArray<WorkflowSnapshot>;
  list({
    workflow,
    type = workflow?.type,
    predicate,
  }: WorkflowListFilter<WorkflowSnapshot> & {
    workflow?: { type: string };
  } = {}) {
    if (!type && !predicate) return this.#list;
    return this.#list.filter(
      (snapshot) =>
        (!type || snapshot.type === type) && (predicate?.(snapshot) ?? true),
    );
  }

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** True once `hydrate` ran, so it's known whether a workflow already exists. */
  get isHydrated() {
    return [...this.#registries.values()].every((r) => r.isHydrated);
  }

  /**
   * Restores stored workflows and follows the unfinished ones. Finished ones
   * don't fire `onFinish` again. Call it on the client, after the first render,
   * and before starting a workflow that could have been stored.
   * `WorkflowClientProvider` does it for you. Nothing is stored until then.
   */
  hydrate() {
    for (const registry of this.#registries.values()) registry.hydrate();
  }

  /** Stops following all the workflows. `hydrate` follows them again. */
  stop() {
    for (const registry of this.#registries.values()) registry.stop();
  }

  #registry(workflow: { type: string }) {
    const registry = this.#registries.get(workflow.type);
    if (!registry) {
      throw new Error(
        `The workflow type "${workflow.type}" isn't in the workflows of this client`,
      );
    }
    return registry;
  }

  #changed() {
    this.#list = [...this.#registries.values()].flatMap(
      (registry) => registry.list() as ReadonlyArray<WorkflowSnapshot>,
    );
    for (const listener of this.#listeners) listener();
  }
}
