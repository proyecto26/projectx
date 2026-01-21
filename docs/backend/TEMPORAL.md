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

## Testing
- **Unit Tests**: Use `@temporalio/testing` with `TestWorkflowEnvironment`.
- **Mocking**: Mock activities to test workflow logic in isolation.

## Search Attributes
- Register custom search attributes (e.g., `Email`, `OrderId`) via the deployment scripts (`search-attributes.sh`) before using them in workflows.
