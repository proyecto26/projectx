import { defineSignal, defineUpdate } from "@temporalio/workflow";

export * from "./state";

export class UnkownException extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = UnkownException.name;
  }
}

export class CancelledException extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = CancelledException.name;
  }
}

// DEFINE SIGNALS
/**
 * Send a request to cancel the workflow
 */
export const cancelWorkflowSignal = defineSignal("cancelWorkflowSignal");

// DEFINE UPDATES
/**
 * Try to cancel the workflow and return true if successful
 */
export const cancelWorkflowUpdate: ReturnType<typeof defineUpdate> =
  defineUpdate<boolean>("cancelWorkflowUpdate");
