# projectx-cli Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: Interactive CLI with Commander.js
The CLI SHALL be built with Commander.js and provide an interactive mode (default) using @clack/prompts. The binary SHALL be named `projectx` and runnable via `pnpm cli` from the project root.

#### Scenario: Running interactive mode
- **WHEN** developer runs `pnpm cli` without arguments
- **THEN** the CLI SHALL display a branded header and interactive menu with options: Generate, Initialize, Info

#### Scenario: Running a direct command
- **WHEN** developer runs `pnpm cli generate service`
- **THEN** the CLI SHALL skip the interactive menu and proceed directly to service generation prompts

### Requirement: Generate basic NestJS service
The CLI SHALL scaffold a basic NestJS microservice with REST API, Swagger docs, and optional Email/Payment module integration.

#### Scenario: Creating a basic service
- **WHEN** developer runs `pnpm cli generate service` and provides name "inventory", port 8084
- **THEN** the CLI SHALL create `apps/inventory/` with app module, controller, service, config files, and test setup

#### Scenario: Auto-configuration after generation
- **WHEN** a service is generated
- **THEN** the CLI SHALL add `dev:<serviceName>` and `build:<serviceName>` scripts to root package.json AND update docker-compose.yml with the new service

### Requirement: Generate Temporal-enabled service
The CLI SHALL scaffold a NestJS service with Temporal workflow support, including activities module, workflow files, and worker configuration.

#### Scenario: Creating a Temporal service
- **WHEN** developer runs `pnpm cli generate temporal-service` with workflow name "processOrder"
- **THEN** the CLI SHALL create the basic service PLUS `activities/` module, `workflows/` directory with initial workflow, and Temporal config

### Requirement: Add workflow to existing service
The CLI SHALL allow adding new workflows to existing Temporal-enabled services.

#### Scenario: Adding a workflow
- **WHEN** developer runs `pnpm cli generate workflow` and selects an existing Temporal service
- **THEN** the CLI SHALL create a new workflow file and update the workflows/index.ts exports

### Requirement: Project initialization and customization
The CLI SHALL provide an `init` command to customize the ProjectX template for a new project.

#### Scenario: Renaming the project
- **WHEN** developer runs `pnpm cli init` and chooses to rename from "projectx" to "myapp"
- **THEN** the CLI SHALL update all `@projectx/*` references to `@myapp/*` across package.json files, tsconfig paths, and documentation

### Requirement: Project information display
The CLI SHALL provide an `info` command showing project name, services (with Temporal badges), packages, ports, and Docker service URLs.

#### Scenario: Displaying project info
- **WHEN** developer runs `pnpm cli info`
- **THEN** the CLI SHALL display services with their ports and Temporal status, available packages, and Docker URLs

### Requirement: Input validation
The CLI SHALL validate all inputs before calling generators. Service names SHALL be kebab-case and unique. Port numbers SHALL be auto-suggested as the next available port.

#### Scenario: Duplicate service name
- **WHEN** developer enters a service name that already exists in apps/
- **THEN** the CLI SHALL display an error and prompt for a different name

#### Scenario: Port auto-suggestion
- **WHEN** existing services use ports 8081-8083
- **THEN** the CLI SHALL suggest 8084 as the next available port

