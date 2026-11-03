# Temporal Workflow Rules

## Core Principles

### 1. Determinism
- **Rule**: Workflow code must be purely deterministic.
- **Forbidden**: `Math.random()`, `Date.now()`, `uuid()`, `setTimeout`, external API calls, global user/file system access.
- **Solution**: Use Temporal SDK functions (`workflow.now()`, `workflow.uuid()`, `workflow.sleep()`) or move logic to **Activities**.

### 2. Activities
- **Purpose**: I/O operations, network requests, database access, or non-deterministic logic.
- **Design**: Keep activities idempotent where possible.
- **Timeouts**: Always configure `startToCloseTimeout` or `scheduleToCloseTimeout` when calling activities.

## Workflow Patterns

### Signal & Query
- **Signals**: Use to push external data into a running workflow.
- **Queries**: Use to read state from a running workflow.
- **Pattern**:
  ```typescript
  export const mySignal = defineSignal('mySignal');
  export const myQuery = defineQuery('myQuery');
  
  export async function myWorkflow() {
    let state = 'initial';
    setHandler(mySignal, (arg) => { state = arg; });
    setHandler(myQuery, () => state);
    
    await condition(() => state === 'ready');
  }
  ```

### Child Workflows
- Use `startChild` to spawn sub-workflows.
- Useful for parallel execution or isolating failure domains.

### Versioning
- **Rule**: Never change the logic of a running workflow without versioning.
- **Mechanism**: Use `workflow.patched` or create a new workflow version for breaking changes.

### Payments in the order workflows
`processPayment` decides how a payment ends, and `createOrder` only shows its progress:
- **Declines:** a declined attempt doesn't end the order, as Stripe lets the customer pay the same intent again. `packages/payment` classifies each failure from Stripe's codes and the charge's Radar outcome. The customer only sees a safe reason, and fraud-type declines read as a plain decline.
- **Ending an order:** it ends on a decline that can't be retried, after `MAX_PAYMENT_ATTEMPTS` failed attempts, on a cancel request, or when `PROCESS_PAYMENT_TIMEOUT` runs out. Before closing, it cancels the intent with Stripe, so a failed order can't be charged later. If the intent was paid in the meantime, the order is confirmed instead.
- **Attempt cap:** customers confirm with Stripe directly, so the cap is best effort. Radar is what stops card testing.
- **Webhooks:** they can arrive twice or out of order. Each event and attempt counts once, and nothing undoes a payment. Events for a closed order are acknowledged, so Stripe doesn't resend them.

These workflows changed without `patched`. Before deploying a change like that, stop new orders and wait until no `createOrder` or `processPayment` is running (`temporal workflow list --query 'ExecutionStatus="Running"'`). Don't terminate them, as that skips cancelling their payment with Stripe.

## Testing
- **Unit Tests**: Use `@temporalio/testing` with `TestWorkflowEnvironment`.
- **Mocking**: Mock activities to test workflow logic in isolation.

## Search Attributes
- Register custom search attributes (e.g., `Email`, `OrderId`) via the deployment scripts (`search-attributes.sh`) before using them in workflows.
