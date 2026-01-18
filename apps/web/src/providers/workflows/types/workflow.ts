export enum WorkflowTypes {
  ORDER = "order",
  // Add other workflows here...
}

export type WorkflowType = WorkflowTypes | `${WorkflowTypes}`;
export enum WorkflowStep {
  START = "start",
  STATUS = "status",
  CANCEL = "cancel",
}

export interface Workflow<T> {
  // The email is used to filter the workflows by the current user
  email?: string;
  // The referenceId is used to identify the workflow in the backend
  referenceId: string;
  // We use the step to identify the current state of the workflow and check if the workflow is completed
  step: WorkflowStep | `${WorkflowStep}`;
  // The data includes the data/state of the workflow from the backend
  data: T;
  // The error indicates if there was an error running this process
  error?: Error;
  // Determines if the workflow was created from the backend and there's a process running
  isInitialized?: boolean;
  // Can can request for a cancellation of the workflow, this flag is used to determine if the workflow is being canceled
  isCanceling?: boolean;
  // The below properties are used to manage the expiration of the workflow
  retries?: number;
  maxRetries?: number;
  expirationTimeInMilliseconds?: number;
  startDate?: number;
}
