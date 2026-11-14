import type {
  WorkflowClient,
  WorkflowExecutionDescription,
} from "@temporalio/client";
import { temporal } from "@temporalio/proto";

export enum WorkflowSearchAttributes {
  Email = "Email",
  UserId = "UserId",
  OrderId = "OrderId",
}

export const WORKFLOW_TTL = 1000 * 60 * 60 * 24; // 24 hours in milliseconds

export const getWorkflowDescription = (
  client: WorkflowClient,
  workflowId: string,
) => client.getHandle(workflowId).describe();

export const isWorkflowRunning = (description: WorkflowExecutionDescription) =>
  description.status.code ===
  temporal.api.enums.v1.WorkflowExecutionStatus
    .WORKFLOW_EXECUTION_STATUS_RUNNING;

export const isWorkflowCompleted = (
  description: WorkflowExecutionDescription,
) =>
  description.status.code ===
  temporal.api.enums.v1.WorkflowExecutionStatus
    .WORKFLOW_EXECUTION_STATUS_COMPLETED;

export const isWorkflowFailed = (description: WorkflowExecutionDescription) =>
  description.status.code ===
  temporal.api.enums.v1.WorkflowExecutionStatus
    .WORKFLOW_EXECUTION_STATUS_FAILED;

async function getWorkflowExecution(
  client: WorkflowClient,
  type: string,
  identifierType: WorkflowSearchAttributes,
  identifier: number,
  isRunning = true,
) {
  const workflow = await client.workflowService.listWorkflowExecutions({
    query: [
      `WorkflowType = "${type}"`,
      `${identifierType} = ${identifier}`,
      isRunning ? `ExecutionStatus="Running"` : null,
    ]
      .filter(Boolean)
      .join(" AND "),
    namespace: client.options.namespace,
  });
  if (workflow.executions.length > 0) {
    return workflow.executions[0];
  }
  return null;
}

export async function getWorkflowExecutionByEmail(
  client: WorkflowClient,
  email: number,
  type: string,
) {
  return getWorkflowExecution(
    client,
    type,
    WorkflowSearchAttributes.Email,
    email,
  );
}

export async function getWorkflowExecutionByUserId(
  client: WorkflowClient,
  userId: number,
  type: string,
) {
  return getWorkflowExecution(
    client,
    type,
    WorkflowSearchAttributes.UserId,
    userId,
  );
}

export async function getWorkflowExecutionByOrderId(
  client: WorkflowClient,
  orderId: number,
  type: string,
) {
  return getWorkflowExecution(
    client,
    type,
    WorkflowSearchAttributes.OrderId,
    orderId,
  );
}
