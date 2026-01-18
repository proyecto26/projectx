import {
  getLoginStateQuery,
  LoginWorkflowCodeStatus,
  type LoginWorkflowData,
  LoginWorkflowNonRetryableErrors,
  type LoginWorkflowState,
  LoginWorkflowStatus,
  verifyLoginCodeUpdate,
} from "@projectx/core/workflows";
import {
  ApplicationFailure,
  allHandlersFinished,
  CancellationScope,
  condition,
  isCancellation,
  log,
  proxyActivities,
  setHandler,
} from "@temporalio/workflow";
import type { ActivitiesService } from "../main";

const { sendLoginEmail } = proxyActivities<ActivitiesService>({
  startToCloseTimeout: "5 seconds",
  retry: {
    initialInterval: "2s",
    maximumInterval: "10s",
    maximumAttempts: 10,
    backoffCoefficient: 1.5,
    nonRetryableErrorTypes: [LoginWorkflowNonRetryableErrors.UNKNOWN_ERROR],
  },
});

const { verifyLoginCode } = proxyActivities<ActivitiesService>({
  startToCloseTimeout: "5 seconds",
  retry: {
    initialInterval: "2s",
    maximumInterval: "10s",
    maximumAttempts: 10,
    backoffCoefficient: 2,
    nonRetryableErrorTypes: [LoginWorkflowNonRetryableErrors.UNKNOWN_ERROR],
  },
});

export async function loginUserWorkflow(
  data: LoginWorkflowData,
): Promise<void> {
  const state: LoginWorkflowState = {
    codeStatus: LoginWorkflowCodeStatus.PENDING,
    status: LoginWorkflowStatus.PENDING,
  };
  // Attach queries, signals and updates
  setHandler(getLoginStateQuery, () => state);
  setHandler(
    verifyLoginCodeUpdate,
    async (code: number) => {
      if (!state.code) {
        throw ApplicationFailure.nonRetryable("Login code not found");
      }
      const user = await verifyLoginCode(data.email, code, state.code);
      if (user) {
        state.user = user;
      }
      return { user };
    },
    { description: "Validate login code" },
  );

  try {
    // Send login email with a generated hashed code
    const hashedCode = await sendLoginEmail(data.email);
    state.code = hashedCode;
    state.codeStatus = LoginWorkflowCodeStatus.SENT;

    // Wait for user to verify code (human interaction)
    await condition(() => !!state.user, "10m");

    // Wait for all handlers to finish before checking the state
    await condition(allHandlersFinished);
    if (state.user) {
      state.status = LoginWorkflowStatus.SUCCESS;
      log.info(`User logged in, user: ${state.user}`);
    } else {
      state.status = LoginWorkflowStatus.FAILED;
      log.error(`User login code expired, email: ${data.email}`);
      throw ApplicationFailure.nonRetryable(
        "User login code expired",
        LoginWorkflowNonRetryableErrors.LOGIN_CODE_EXPIRED,
      );
    }
    return;
  } catch (error) {
    // If the error is an application failure, throw it
    if (error instanceof ApplicationFailure) {
      throw error;
    }
    // Otherwise, update the state and log the error
    state.status = LoginWorkflowStatus.FAILED;
    if (!isCancellation(error)) {
      log.error(`Login workflow failed, email: ${data.email}, error: ${error}`);
    } else {
      log.warn(`Login workflow cancelled, email: ${data.email}`);
      await CancellationScope.nonCancellable(async () => {
        // TODO: Handle workflow cancellation
      });
    }
  }
}
