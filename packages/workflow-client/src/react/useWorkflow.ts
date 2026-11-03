"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WorkflowActions } from "../actions";
import type { WorkflowClient, WorkflowDefinitionOf } from "../client";
import {
  WorkflowSession,
  type WorkflowSessionOptions,
  type WorkflowSessionSnapshot,
} from "../session";
import { WorkflowClientError } from "../types";
import { useWorkflowClient } from "./context";

export type UseWorkflowOptions<
  TState,
  TInput,
  TResult,
  TActions = never,
> = /** A session you create and own, it isn't stopped on unmount. */
| { session: WorkflowSession<TState, TInput, TResult, TActions> }
/** A workflow kept by a client, passed here or by the provider. */
| {
    workflow: WorkflowDefinitionOf<TState, TInput, TResult, TActions>;
    id: string;
    client?: WorkflowClient<never>;
  }
/** A workflow tied to this component. It stops following on unmount. */
| (WorkflowSessionOptions<TState, TInput, TResult, TActions> & {
    /** Follow a workflow already running when the component mounts. */
    resume?: boolean;
  });

export type UseWorkflowHelpers<
  TState,
  TInput,
  TResult,
  TActions = never,
> = WorkflowSessionSnapshot<TState, TResult> & {
  isActive: boolean;
  start: WorkflowSession<TState, TInput, TResult>["start"];
  resume: WorkflowSession<TState, TInput, TResult>["resume"];
  cancel: WorkflowSession<TState, TInput, TResult>["cancel"];
  /** One function for each action. They reject if the backend refuses. */
  actions: WorkflowActions<TActions>;
  stop: WorkflowSession<TState, TInput, TResult>["stop"];
  clearError: WorkflowSession<TState, TInput, TResult>["clearError"];
  /** Stops following it and forgets it. The workflow keeps running. */
  remove: () => void;
};

/** Connects a component to a workflow. */
export function useWorkflow<
  TState,
  TInput = unknown,
  TResult = TState,
  TActions = never,
>(
  options: UseWorkflowOptions<TState, TInput, TResult, TActions>,
): UseWorkflowHelpers<TState, TInput, TResult, TActions> {
  const contextClient = useWorkflowClient();

  // The session is created once per id, so it reads the latest options from a
  // ref refreshed on every render, avoiding stale callbacks and tokens.
  const latest = useRef(options);
  latest.current = options;

  const ownedOptions = "transport" in options ? options : undefined;
  const externalSession = "session" in options ? options.session : undefined;
  const definition = "workflow" in options ? options.workflow : undefined;
  const client =
    "workflow" in options ? (options.client ?? contextClient) : undefined;
  const type = definition?.type;
  const id = "session" in options ? options.session.id : options.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a new workflow creates a new session
  const { session, isOwned } = useMemo(() => {
    if (externalSession) return { session: externalSession, isOwned: false };
    if (definition && client) {
      return { session: client.session(definition, id), isOwned: false };
    }
    if (!ownedOptions) {
      throw new Error(
        "useWorkflow needs a session, a transport, or a workflow with a client from WorkflowClientProvider",
      );
    }
    const read = () =>
      latest.current as WorkflowSessionOptions<
        TState,
        TInput,
        TResult,
        TActions
      >;
    return {
      session: new WorkflowSession<TState, TInput, TResult, TActions>({
        ...ownedOptions,
        transport: {
          start: (o) => read().transport.start(o),
          subscribe: (o) => read().transport.subscribe(o),
          cancel: (o) => read().transport.cancel(o),
          // Always there, as the latest options can have it. The session
          // reports a transport without it from here.
          send: async (o) => {
            const { transport } = read();
            if (!transport.send) {
              throw new WorkflowClientError(
                "This transport can't send actions",
              );
            }
            return transport.send(o);
          },
        },
        isFinal: (state) => read().isFinal?.(state) ?? false,
        onState: (s) => read().onState?.(s),
        onFinish: (s) => read().onFinish?.(s),
        onError: (e, s) => read().onError?.(e, s),
      }),
      isOwned: true,
    };
  }, [externalSession, client, type, id]);

  // Rendering asks for a snapshot through state instead of useSyncExternalStore,
  // as useChat does, so updates don't interrupt navigation renders.
  const [view, setView] = useState(() => ({
    session,
    snapshot: session.getSnapshot(),
  }));
  // By session and not by id, as another client can have the same id: this render
  // must not show the workflow of a previous user with the actions of the new one
  const snapshot =
    view.session === session ? view.snapshot : session.getSnapshot();
  if (view.session !== session) setView({ session, snapshot });

  useEffect(() => {
    const publish = () => setView({ session, snapshot: session.getSnapshot() });
    const unsubscribe = session.subscribe(publish);
    // Catch changes between rendering and subscribing
    publish();
    return unsubscribe;
  }, [session]);

  const shouldResume =
    "resume" in options && options.resume === true && isOwned;
  useEffect(() => {
    if (!isOwned) return;
    if (shouldResume) session.resume();
    // Strict Mode runs this twice, and resume() is able to start over
    return () => session.stop();
  }, [isOwned, session, shouldResume]);

  const remove = useCallback(() => {
    session.stop();
    if (definition) client?.remove(definition, session.id);
  }, [client, definition, session]);

  return {
    ...snapshot,
    isActive: snapshot.status === "starting" || snapshot.status === "running",
    start: session.start,
    resume: session.resume,
    cancel: session.cancel,
    actions: session.actions,
    stop: session.stop,
    clearError: session.clearError,
    remove,
  };
}
