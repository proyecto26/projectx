# temporal-workflows Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: Workflow determinism
All Temporal workflows SHALL be deterministic. Workflows MUST NOT use random number generation, current time, network calls, or any non-deterministic operations directly. Side effects SHALL be performed exclusively through activities.

#### Scenario: Non-deterministic operation in workflow
- **WHEN** a workflow needs to call an external API or access the current time
- **THEN** it SHALL delegate to an activity function, never perform the operation directly in workflow code

### Requirement: Activity-based side effects with retry policies
All side effects (HTTP calls, database operations, email sending, payment processing) SHALL be implemented as activities with configurable retry policies including exponential backoff.

#### Scenario: Activity with retry
- **WHEN** an activity fails (e.g., payment API timeout)
- **THEN** Temporal SHALL retry according to the configured retry policy with exponential backoff

### Requirement: Signal and query handlers for workflow communication
Workflows SHALL use Temporal signals for receiving external events and queries for inspecting workflow state. Updates SHALL be used for synchronous mutations when supported.

#### Scenario: Querying workflow state
- **WHEN** an external system needs to check order processing status
- **THEN** it SHALL use a Temporal query to retrieve the current workflow state without affecting execution

#### Scenario: Signaling a workflow
- **WHEN** an external event occurs (e.g., payment confirmed)
- **THEN** the system SHALL send a Temporal signal to the running workflow to advance its state

### Requirement: Workflow versioning for safe updates
Changes to running workflows SHALL use the Temporal versioning API (`patched` or `Workflow.patched()`) to maintain backward compatibility with in-flight executions.

#### Scenario: Updating a running workflow
- **WHEN** a workflow definition is modified while instances are running
- **THEN** the developer SHALL use `patched()` to version the change so existing executions complete safely

### Requirement: Worker configuration per service
Each Temporal-enabled service SHALL run its own worker that registers the service's workflows and activities. Workers SHALL connect to the Temporal server configured via environment variables.

#### Scenario: Worker startup
- **WHEN** a Temporal-enabled service starts
- **THEN** its worker SHALL register all exported workflows and activity implementations with the configured Temporal namespace

### Requirement: Shared workflow utilities in @projectx/workflows
Common Temporal client setup, worker configuration, and utility functions SHALL be provided by the `@projectx/workflows` package.

#### Scenario: Creating a workflow client
- **WHEN** a service needs to start or signal a workflow
- **THEN** it SHALL use the shared client utilities from `@projectx/workflows`

