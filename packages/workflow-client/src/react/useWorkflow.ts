"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { WorkflowRegistry } from "../registry";
import {
  WorkflowSession,
  type WorkflowSessionOptions,
  type WorkflowSessionSnapshot,
} from "../session";
import { useWorkflowRegistry } from "./context";

export type UseWorkflowOptions<TState, TInput, TResult> =
  /** A session you create and own, it isn't stopped on unmount. */
  | { session: WorkflowSession<TState, TInput, TResult> }
  /** A workflow kept by a registry, passed here or by the provider. */
  | { id: string; registry?: WorkflowRegistry<TState, TInput, TResult> }
  /** A workflow tied to this component. It stops following on unmount. */
  | (WorkflowSessionOptions<TState, TInput, TResult> & {
      /** Follow a workflow already running when the component mounts. */
      resume?: boolean;
    });

export type UseWorkflowHelpers<TState, TInput, TResult> =
  WorkflowSessionSnapshot<TState, TResult> & {
    isActive: boolean;
    start: WorkflowSession<TState, TInput, TResult>["start"];
    resume: WorkflowSession<TState, TInput, TResult>["resume"];
    cancel: WorkflowSession<TState, TInput, TResult>["cancel"];
    stop: WorkflowSession<TState, TInput, TResult>["stop"];
    clearError: WorkflowSession<TState, TInput, TResult>["clearError"];
    /** Stops following it and forgets it. The workflow keeps running. */
    remove: () => void;
  };

/** Connects a component to a workflow. */
export function useWorkflow<TState, TInput = unknown, TResult = TState>(
  options: UseWorkflowOptions<TState, TInput, TResult>,
): UseWorkflowHelpers<TState, TInput, TResult> {
  const contextRegistry = useWorkflowRegistry<TState, TInput, TResult>();

  // The session is created once per id, so it reads the latest options from a
  // ref refreshed on every render, avoiding stale callbacks and tokens.
  const latest = useRef(options);
  latest.current = options;

  const ownedOptions = "transport" in options ? options : undefined;
  const externalSession = "session" in options ? options.session : undefined;
  const registry =
    "transport" in options || "session" in options
      ? undefined
      : (options.registry ?? contextRegistry);
  const id = "session" in options ? options.session.id : options.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only a new workflow creates a new session
  const { session, isOwned } = useMemo(() => {
    if (externalSession) return { session: externalSession, isOwned: false };
    if (registry) return { session: registry.session(id), isOwned: false };
    if (!ownedOptions) {
      throw new Error(
        "useWorkflow needs a session, a transport, or a registry from WorkflowRegistryProvider",
      );
    }
    const read = () =>
      latest.current as WorkflowSessionOptions<TState, TInput, TResult>;
    return {
      session: new WorkflowSession<TState, TInput, TResult>({
        ...ownedOptions,
        transport: {
          start: (o) => read().transport.start(o),
          subscribe: (o) => read().transport.subscribe(o),
          cancel: (o) => read().transport.cancel(o),
        },
        isFinal: (state) => read().isFinal?.(state) ?? false,
        onState: (s) => read().onState?.(s),
        onFinish: (s) => read().onFinish?.(s),
        onError: (e, s) => read().onError?.(e, s),
      }),
      isOwned: true,
    };
  }, [externalSession, registry, id]);

  // Rendering asks for a snapshot through state instead of useSyncExternalStore,
  // as useChat does, so updates don't interrupt navigation renders.
  const [snapshot, setSnapshot] = useState(session.getSnapshot);
  if (snapshot.id !== session.id) setSnapshot(session.getSnapshot());

  useEffect(() => {
    const publish = () => setSnapshot(session.getSnapshot());
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
    registry?.remove(session.id);
  }, [registry, session]);

  return {
    ...snapshot,
    isActive: snapshot.status === "starting" || snapshot.status === "running",
    start: session.start,
    resume: session.resume,
    cancel: session.cancel,
    stop: session.stop,
    clearError: session.clearError,
    remove,
  };
}
