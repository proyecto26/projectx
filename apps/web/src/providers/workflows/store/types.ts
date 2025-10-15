import type { Dispatch, Reducer } from "react";

import type { Workflow, WorkflowType } from "../types";

export enum StoreActions {
  RunWorkflow = 0,
  ClearWorkflow = 1,
  UpdateWorkflow = 2,
  UpsertWorkflow = 3,
}

export type StoreState = {
  workflows: Record<WorkflowType, Array<Workflow<unknown>>>;
};

export type StoreAction =
  | {
      type: StoreActions.RunWorkflow;
      payload: Workflow<unknown>;
      workflowType: WorkflowType;
    }
  | {
      type: StoreActions.ClearWorkflow;
      referenceId: Workflow<unknown>["referenceId"];
      workflowType: WorkflowType;
    }
  | {
      type: StoreActions.UpdateWorkflow;
      payload: Workflow<unknown>;
      workflowType: WorkflowType;
      referenceId: Workflow<unknown>["referenceId"];
    }
  | {
      type: StoreActions.UpsertWorkflow;
      payload: Partial<Workflow<unknown>>;
      workflowType: WorkflowType;
      referenceId: Workflow<unknown>["referenceId"];
    };

export type StoreReducer = Reducer<StoreState, StoreAction>;
export type StoreDispatch = Dispatch<StoreAction>;

export type ContextProps = [StoreState, StoreDispatch];
