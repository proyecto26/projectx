import type { Workflow } from "./workflow";

export type HandleErrorEventParams<T> = {
  workflow: T;
  error?: Error;
};
export type HandleErrorEvent<T extends Workflow<unknown>> = (
  params: HandleErrorEventParams<T>,
) => void;

export type HandleRunEventParams<T> = {
  workflow: T;
};
export type HandleRunEvent<T extends Workflow<unknown>> = (
  params: HandleRunEventParams<T>,
) => void;

export type HandleUpdateEventParams<T> = {
  workflow: T;
  referenceId?: string;
};
export type HandleUpdateEvent<T extends Workflow<unknown>> = (
  params: HandleUpdateEventParams<T>,
) => void;

export type HandleUpsertEvent<T extends Workflow<unknown>> = (params: {
  workflow: Partial<T>;
  referenceId?: string;
}) => void;

export type HandleClearEventParams<T> = {
  workflow: T;
};
export type HandleClearEvent<T extends Workflow<unknown>> = (
  params: HandleClearEventParams<T>,
) => void;
