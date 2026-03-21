import type { Edge, Node } from "@xyflow/react";

export interface Preset {
  label: string;
  desc: string;
  build: () => { nodes: Node[]; edges: Edge[] };
}

export const PRESETS: Record<string, Preset> = {
  payment: {
    label: "Payment Processing",
    desc: "Activity \u2192 Signal \u2192 Condition (order workflow pattern)",
    build: () => ({
      nodes: [
        {
          id: "p-start",
          type: "start",
          position: { x: 50, y: 50 },
          data: {
            workflowName: "createOrder",
            params: [
              {
                name: "data",
                type: "OrderData",
                required: true,
                description: "Order workflow input data",
                defaultValue: "",
              },
            ],
          },
        },
        {
          id: "p-act",
          type: "activity",
          position: { x: 380, y: 50 },
          data: {
            activityName: "createOrder",
            timeout: "5 seconds",
            maxAttempts: 10,
          },
        },
        {
          id: "p-child",
          type: "childWorkflow",
          position: { x: 700, y: 50 },
          data: {
            workflowName: "processPayment",
            workflowId: "payment-{referenceId}",
            args: "data",
          },
        },
        {
          id: "p-cond",
          type: "condition",
          position: { x: 700, y: 250 },
          data: {
            condition: "processPaymentResult.status === SUCCESS",
            timeout: "15 minutes",
          },
        },
        {
          id: "p-end",
          type: "end",
          position: { x: 700, y: 430 },
          data: { returnValue: "state (Confirmed or Failed)" },
        },
        {
          id: "p-sig",
          type: "signal",
          position: { x: 380, y: 380 },
          data: {
            signalName: "paymentWebhookEvent",
            params: "event: PaymentWebhookEvent",
            stateUpdates: "status",
          },
        },
        {
          id: "p-query",
          type: "query",
          position: { x: 50, y: 430 },
          data: {
            queryName: "getOrderState",
            returnType: "OrderStatusResponseDto",
          },
        },
        {
          id: "p-update",
          type: "update",
          position: { x: 50, y: 570 },
          data: {
            updateName: "createOrderUpdate",
            params: "(none)",
            async: false,
          },
        },
      ],
      edges: [
        {
          id: "p-e1",
          source: "p-start",
          sourceHandle: "flow-out",
          target: "p-act",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "p-e2",
          source: "p-act",
          sourceHandle: "flow-out",
          target: "p-child",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "p-e3",
          source: "p-child",
          sourceHandle: "flow-out",
          target: "p-cond",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "p-e4",
          source: "p-cond",
          sourceHandle: "flow-out",
          target: "p-end",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "p-e5",
          source: "p-start",
          sourceHandle: "flow-out",
          target: "p-sig",
          targetHandle: "wf-in",
          type: "workflow",
        },
        {
          id: "p-e6",
          source: "p-start",
          sourceHandle: "flow-out",
          target: "p-query",
          targetHandle: "wf-in",
          type: "workflow",
        },
        {
          id: "p-e7",
          source: "p-start",
          sourceHandle: "flow-out",
          target: "p-update",
          targetHandle: "wf-in",
          type: "workflow",
        },
      ],
    }),
  },
  login: {
    label: "Human-in-the-Loop Login",
    desc: "Activity \u2192 Update \u2192 Condition (login pattern)",
    build: () => ({
      nodes: [
        {
          id: "l-start",
          type: "start",
          position: { x: 50, y: 50 },
          data: {
            workflowName: "loginUserWorkflow",
            params: [
              {
                name: "data",
                type: "LoginWorkflowData",
                required: true,
                description: "Login workflow input",
                defaultValue: "",
              },
            ],
          },
        },
        {
          id: "l-act",
          type: "activity",
          position: { x: 380, y: 50 },
          data: {
            activityName: "sendLoginEmail",
            timeout: "5 seconds",
            maxAttempts: 10,
          },
        },
        {
          id: "l-query",
          type: "query",
          position: { x: 50, y: 280 },
          data: {
            queryName: "getLoginState",
            returnType: "LoginWorkflowState",
          },
        },
        {
          id: "l-update",
          type: "update",
          position: { x: 380, y: 280 },
          data: {
            updateName: "verifyLoginCode",
            params: "code: number",
            async: false,
          },
        },
        {
          id: "l-cond",
          type: "condition",
          position: { x: 700, y: 50 },
          data: { condition: "!!state.user", timeout: "10 minutes" },
        },
        {
          id: "l-end",
          type: "end",
          position: { x: 700, y: 230 },
          data: { returnValue: "void (state.status = SUCCESS)" },
        },
      ],
      edges: [
        {
          id: "l-e1",
          source: "l-start",
          sourceHandle: "flow-out",
          target: "l-act",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "l-e2",
          source: "l-act",
          sourceHandle: "flow-out",
          target: "l-cond",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "l-e3",
          source: "l-cond",
          sourceHandle: "flow-out",
          target: "l-end",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "l-e4",
          source: "l-start",
          sourceHandle: "flow-out",
          target: "l-query",
          targetHandle: "wf-in",
          type: "workflow",
        },
        {
          id: "l-e5",
          source: "l-start",
          sourceHandle: "flow-out",
          target: "l-update",
          targetHandle: "wf-in",
          type: "workflow",
        },
      ],
    }),
  },
  parentChild: {
    label: "Parent + Child Workflow",
    desc: "Parent spawns child workflow pattern",
    build: () => ({
      nodes: [
        {
          id: "pc-start",
          type: "start",
          position: { x: 50, y: 100 },
          data: {
            workflowName: "parentWorkflow",
            params: [
              {
                name: "data",
                type: "WorkflowInput",
                required: true,
                description: "Workflow input data",
                defaultValue: "",
              },
            ],
          },
        },
        {
          id: "pc-act1",
          type: "activity",
          position: { x: 380, y: 100 },
          data: {
            activityName: "prepareData",
            timeout: "5 seconds",
            maxAttempts: 10,
          },
        },
        {
          id: "pc-child",
          type: "childWorkflow",
          position: { x: 380, y: 300 },
          data: {
            workflowName: "childWorkflow",
            workflowId: "child-{id}",
            args: "preparedData",
          },
        },
        {
          id: "pc-cond",
          type: "condition",
          position: { x: 700, y: 100 },
          data: { condition: "childResult.success", timeout: "30 minutes" },
        },
        {
          id: "pc-act2",
          type: "activity",
          position: { x: 700, y: 300 },
          data: {
            activityName: "reportResult",
            timeout: "5 seconds",
            maxAttempts: 10,
          },
        },
        {
          id: "pc-end",
          type: "end",
          position: { x: 700, y: 480 },
          data: { returnValue: "result" },
        },
      ],
      edges: [
        {
          id: "pc-e1",
          source: "pc-start",
          sourceHandle: "flow-out",
          target: "pc-act1",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "pc-e2",
          source: "pc-act1",
          sourceHandle: "flow-out",
          target: "pc-child",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "pc-e3",
          source: "pc-child",
          sourceHandle: "flow-out",
          target: "pc-cond",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "pc-e4",
          source: "pc-cond",
          sourceHandle: "flow-out",
          target: "pc-act2",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "pc-e5",
          source: "pc-act2",
          sourceHandle: "flow-out",
          target: "pc-end",
          targetHandle: "flow-in",
          type: "flow",
        },
      ],
    }),
  },
  stateMachine: {
    label: "Signal-Driven State Machine",
    desc: "Multiple signal handlers managing transitions",
    build: () => ({
      nodes: [
        {
          id: "sm-start",
          type: "start",
          position: { x: 50, y: 50 },
          data: {
            workflowName: "stateMachineWorkflow",
            params: [
              {
                name: "initialState",
                type: "string",
                required: true,
                description: "Initial state value",
                defaultValue: "",
              },
            ],
          },
        },
        {
          id: "sm-sig1",
          type: "signal",
          position: { x: 380, y: 50 },
          data: {
            signalName: "transition",
            params: "event: { type: string, payload: unknown }",
            stateUpdates: "current, history",
          },
        },
        {
          id: "sm-sig2",
          type: "signal",
          position: { x: 380, y: 250 },
          data: {
            signalName: "reset",
            params: "(none)",
            stateUpdates: "current \u2192 initial, history cleared",
          },
        },
        {
          id: "sm-query",
          type: "query",
          position: { x: 380, y: 430 },
          data: {
            queryName: "getStateMachineState",
            returnType: "StateMachineState",
          },
        },
        {
          id: "sm-cond",
          type: "condition",
          position: { x: 700, y: 50 },
          data: {
            condition:
              'state.current === "completed" || state.current === "failed"',
            timeout: "1 hour",
          },
        },
        {
          id: "sm-end",
          type: "end",
          position: { x: 700, y: 230 },
          data: { returnValue: "state" },
        },
      ],
      edges: [
        {
          id: "sm-e1",
          source: "sm-start",
          sourceHandle: "flow-out",
          target: "sm-cond",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "sm-e2",
          source: "sm-cond",
          sourceHandle: "flow-out",
          target: "sm-end",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "sm-e3",
          source: "sm-start",
          sourceHandle: "flow-out",
          target: "sm-sig1",
          targetHandle: "wf-in",
          type: "workflow",
        },
        {
          id: "sm-e4",
          source: "sm-start",
          sourceHandle: "flow-out",
          target: "sm-sig2",
          targetHandle: "wf-in",
          type: "workflow",
        },
        {
          id: "sm-e5",
          source: "sm-start",
          sourceHandle: "flow-out",
          target: "sm-query",
          targetHandle: "wf-in",
          type: "workflow",
        },
      ],
    }),
  },
  longRunning: {
    label: "Long-Running + ContinueAsNew",
    desc: "Loop with Sleep and periodic checkpointing",
    build: () => ({
      nodes: [
        {
          id: "lr-start",
          type: "start",
          position: { x: 50, y: 100 },
          data: {
            workflowName: "longRunningWorkflow",
            params: [
              {
                name: "config",
                type: "LoopConfig",
                required: true,
                description: "Loop configuration",
                defaultValue: '{ interval: "1m", maxIterations: 10 }',
              },
            ],
          },
        },
        {
          id: "lr-act",
          type: "activity",
          position: { x: 380, y: 100 },
          data: {
            activityName: "processIteration",
            timeout: "30 seconds",
            maxAttempts: 5,
          },
        },
        {
          id: "lr-sleep",
          type: "sleep",
          position: { x: 380, y: 300 },
          data: { duration: "5 minutes" },
        },
        {
          id: "lr-cond",
          type: "condition",
          position: { x: 700, y: 100 },
          data: {
            condition: "iteration >= maxIterations || shouldContinueAsNew",
            timeout: "24 hours",
          },
        },
        {
          id: "lr-end",
          type: "end",
          position: { x: 700, y: 300 },
          data: { returnValue: "{ completed: true } or continueAsNew(state)" },
        },
        {
          id: "lr-query",
          type: "query",
          position: { x: 50, y: 330 },
          data: {
            queryName: "getProgress",
            returnType: "{ iteration: number, total: number }",
          },
        },
      ],
      edges: [
        {
          id: "lr-e1",
          source: "lr-start",
          sourceHandle: "flow-out",
          target: "lr-act",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "lr-e2",
          source: "lr-act",
          sourceHandle: "flow-out",
          target: "lr-sleep",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "lr-e3",
          source: "lr-sleep",
          sourceHandle: "flow-out",
          target: "lr-cond",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "lr-e4",
          source: "lr-cond",
          sourceHandle: "flow-out",
          target: "lr-end",
          targetHandle: "flow-in",
          type: "flow",
        },
        {
          id: "lr-e5",
          source: "lr-start",
          sourceHandle: "flow-out",
          target: "lr-query",
          targetHandle: "wf-in",
          type: "workflow",
        },
      ],
    }),
  },
};
