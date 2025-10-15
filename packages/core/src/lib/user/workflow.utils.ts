import type { UserDto } from "@projectx/models";
import { defineQuery, defineUpdate } from "@temporalio/workflow";

export type LoginWorkflowData = {
  email: string;
};

export enum LoginWorkflowCodeStatus {
  PENDING = "PENDING",
  SENT = "SENT",
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

export enum LoginWorkflowRetryableErrors {
  VERIFY_LOGIN_CODE_FAILURE = "VERIFY_LOGIN_CODE_FAILURE",
}

export enum LoginWorkflowNonRetryableErrors {
  UNKNOWN_ERROR = "UNKNOWN_ERROR_NON_RETRY",
  LOGIN_CODE_EXPIRED = "LOGIN_CODE_EXPIRED",
}

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
>("verifyLoginCodeUpdate");
