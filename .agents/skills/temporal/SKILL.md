---
name: temporal
description: This skill should be used when the user asks to "create a Temporal workflow", "write a Temporal activity", "debug stuck workflow", "fix non-determinism error", "Temporal TypeScript", "workflow replay", "activity timeout", "signal workflow", "query workflow", "worker not starting", "activity keeps retrying", "Temporal heartbeat", "continue-as-new", "child workflow", "saga pattern", "workflow versioning", "durable execution", "reliable distributed systems", mentions Temporal SDK development or implementing Temporal stuff (workflows, workers, activities), managing queries, updates and signals for existing workflows or updating the configuration for the Temporal worker and clients from our package packages/workflows such as WorkflowsModule, WorkerService, ClientService, or Workflow utils.
allowed-tools: Read, Grep, Glob, Edit, Write
version: 0.1.0
---

# Temporal Workflow Development

## Overview

Temporal is a durable execution platform that makes workflows survive failures automatically. This skill provides guidance for building Temporal applications.

## Core Architecture

The **Temporal Cluster** is the central orchestration backend. It maintains three key subsystems: the **Event History** (a durable log of all workflow state), **Task Queues** (which route work to the right workers), and a **Visibility** store (for searching and listing workflows). There are three ways to run a Cluster:

- **Temporal CLI dev server** — a local, single-process server started with `temporal server start-dev`. Suitable for development and testing only, not production.
- **Self-hosted** — you deploy and manage the Temporal server and its dependencies (e.g., database) in your own infrastructure for production use.
- **Temporal Cloud** — a fully managed production service operated by Temporal. No cluster infrastructure to manage.

**Workers** are long-running processes that you run and manage. They poll Task Queues for work and execute your code. You might run a single Worker process on one machine during development, or run many Worker processes across a large fleet of machines in production. Each Worker hosts two types of code:

- **Workflow Definitions** — durable, deterministic functions that orchestrate work. These must not have side effects.
- **Activity Implementations** — non-deterministic operations (API calls, file I/O, etc.) that can fail and be retried.

Workers communicate with the Cluster via a poll/complete loop: they poll a Task Queue for tasks, execute the corresponding Workflow or Activity code, and report results back.

## History Replay: Why Determinism Matters

Temporal achieves durability through **history replay**:

1. **Initial Execution** - Worker runs workflow, generates Commands, stored as Events in history
2. **Recovery** - On restart/failure, Worker re-executes workflow from beginning
3. **Matching** - SDK compares generated Commands against stored Events
4. **Restoration** - Uses stored Activity results instead of re-executing

**If Commands don't match Events = Non-determinism Error = Workflow blocked**

| Workflow Code | Command | Event |
|--------------|---------|-------|
| Execute activity | `ScheduleActivityTask` | `ActivityTaskScheduled` |
| Sleep/timer | `StartTimer` | `TimerStarted` |
| Child workflow | `StartChildWorkflowExecution` | `ChildWorkflowExecutionStarted` |

See `references/core/determinism.md` for detailed explanation.

### Read All Relevant References

1. First, read the getting started guide for the language you are working in:
    - TypeScript -> read `references/typescript/typescript.md`
2. Second, read appropriate `core` and language-specific references for the task at hand.

## Primary References
- **`references/core/determinism.md`** - Why determinism matters, replay mechanics, basic concepts of activities
    + Language-specific info at `references/typescript/determinism.md`
- **`references/core/patterns.md`** - Conceptual patterns (signals, queries, saga)
    + Language-specific info at `references/typescript/patterns.md`
- **`references/core/gotchas.md`** - Anti-patterns and common mistakes
    + Language-specific info at `references/typescript/gotchas.md`
- **`references/core/versioning.md`** - Versioning strategies and concepts - how to safely change workflow code while workflows are running
    + Language-specific info at `references/typescript/versioning.md`
- **`references/core/troubleshooting.md`** - Decision trees, recovery procedures
- **`references/core/error-reference.md`** - Common error types, workflow status reference
- **`references/core/interactive-workflows.md`** - Testing signals, updates, queries
- **`references/core/dev-management.md`** - Dev cycle & management of server and workers
- **`references/core/ai-patterns.md`** - AI/LLM pattern concepts
    + Language-specific info at `references/typescript/ai-patterns.md`, if available. Currently Python only.

## Additional Topics
- **`references/typescript/observability.md`** - See for language-specific implementation guidance on observability in Temporal
- **`references/typescript/advanced-features.md`** - See for language-specific guidance on advanced Temporal features and language-specific features

## Workflows Location

Temporal workflows and activities are located inside the NestJS apps in this monorepo.
```
apps/<NESTJS_APP>/
├── src/
│   ├── workflows/  # Workflow definitions
│   ├── main.ts     # Export activities to be used in workflows (export * from "./app/activities/activities.service")
│   ├── config
│   │   └── temporal.config.ts       # Temporal configuration (host, namespace, taskQueue)
│   └── app/
│       ├── activities/              # Activity implementations
│       │   ├── activities.module.ts # Module to export services
│       │   └── activities.service.ts # Service to define the activities used in the workflows
│       └── app.module.ts            # Import WorkflowsModule.registerAsync to configure workflows and activities
└── nest-cli.json                    # compilerOptions.assets include the path src/workflows/**/*
```

## Workflow Basics

Workflows are deterministic functions that orchestrate activities.

### Example Defining a Workflow

```typescript
// apps/order/src/workflows/order.workflow.ts
import {
  proxyActivities,
  sleep,
  defineSignal,
  setHandler,
  condition,
} from '@temporalio/workflow';
import type * as activities from '../activities';

const { processPayment, sendOrderConfirmation, updateInventory, notifyShipping } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '5 minutes',
    retry: {
      maximumAttempts: 3,
      initialInterval: '1 second',
      backoffCoefficient: 2,
    },
  });

export const cancelOrderSignal = defineSignal('cancelOrder');

export interface OrderWorkflowInput {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  total: number;
}

export async function orderWorkflow(input: OrderWorkflowInput): Promise<string> {
  let cancelled = false;

  setHandler(cancelOrderSignal, () => {
    cancelled = true;
  });

  // Step 1: Process payment
  const paymentResult = await processPayment({
    orderId: input.orderId,
    amount: input.total,
    customerId: input.customerId,
  });

  if (!paymentResult.success) {
    return 'PAYMENT_FAILED';
  }

  // Check for cancellation
  if (cancelled) {
    // Refund payment
    await refundPayment({ paymentId: paymentResult.paymentId });
    return 'CANCELLED';
  }

  // Step 2: Update inventory
  await updateInventory(input.items);

  // Step 3: Send confirmation email
  await sendOrderConfirmation({
    orderId: input.orderId,
    customerId: input.customerId,
  });

  // Step 4: Wait for shipping (with timeout)
  await sleep('1 hour');
  await notifyShipping({ orderId: input.orderId });

  return 'COMPLETED';
}
```

## Activities

Activities are the building blocks that perform actual work (Steps of the workflows).

### Defining Activities

```typescript
// apps/<NESTJS_APP>/src/app/activities/aproctivities.services.ts
import { Inject, Injectable } from "@nestjs/common";
import { StripeService } from "@projectx/payment";

export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  customerId: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(StripeService) public readonly stripeService: StripeService,
  ) {}

  async function processPayment(
    input: ProcessPaymentInput
  ): Promise<ProcessPaymentResult> {
    try {
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: Math.round(input.amount * 100),
        currency: 'usd',
        metadata: {
          orderId: input.orderId,
          customerId: input.customerId,
        },
      });

      return {
        success: true,
        paymentId: paymentIntent.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  async function refundPayment(input: { paymentId: string }): Promise<void> {
    await this.stripeService.refundPayment(input.paymentId);
  }
}
```

## Docker Setup

The project includes Temporal in docker-compose.yml:

```bash
# Start Temporal server + UI
docker-compose up -d temporal temporal-ui

# Access Temporal UI
open http://localhost:8080
```

## Best Practices

1. **Keep workflows deterministic** - No direct I/O, random, or time-dependent operations
2. **Use activities for side effects** - All external calls go in activities
3. **Set appropriate timeouts** - Configure startToCloseTimeout for activities
4. **Handle signals gracefully** - Check for signals at appropriate points
5. **Use queries for state** - Don't expose internal state directly
6. **Version workflows** - Use workflow versioning for updates
7. **Test workflows** - Use Temporal's testing framework
