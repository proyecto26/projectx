import type { UserDto } from "@projectx/models";
import { defineQuery, defineUpdate } from "@temporalio/workflow";

export type LoginWorkflowData = {
  email: string;
};

export enum LoginWorkflowCodeStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  ERROR_SENDING_EMAIL = "ERROR_SENDING_EMAIL",
}

export enum LoginWorkflowStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
}

export type LoginWorkflowState = {
  codeStatus: LoginWorkflowCodeStatus;
  user?: UserDto;
  status: LoginWorkflowStatus;
  code?: string;
};

export class LoginCodeExpiredException extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = LoginCodeExpiredException.name;
  }
}

export const LOGIN_WORKFLOW_TIMEOUT = "10m";

// DEFINE QUERIES
/**
 * Get the login state
 */
export const getLoginStateQuery = defineQuery<LoginWorkflowState | null>(
  "getLoginStateQuery",
);

// DEFINE UPDATES
/**
 * Verify the login code
 */
export const verifyLoginCodeUpdate = defineUpdate<
  {
    user?: UserDto;
  },
  [number]
>("verifyLoginCodeUpdate") as ReturnType<
  typeof defineUpdate<
    {
      user?: UserDto;
    },
    [number]
  >
>;
