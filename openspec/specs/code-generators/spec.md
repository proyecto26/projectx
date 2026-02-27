# code-generators Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: Turborepo generators for service scaffolding
The system SHALL provide Turborepo generators (Plop.js-based) at `turbo/generators/` for scaffolding NestJS services and workflows using Handlebars templates.

#### Scenario: Using Turbo generator directly
- **WHEN** developer runs `pnpm gen:service`
- **THEN** Turborepo SHALL prompt for inputs and generate the service using templates at `turbo/generators/templates/nestjs-service/`

#### Scenario: Using Turbo generator for Temporal service
- **WHEN** developer runs `pnpm gen:temporal-service`
- **THEN** Turborepo SHALL generate the service with additional Temporal files using templates at `turbo/generators/templates/nestjs-temporal-service/`

### Requirement: Handlebars template variables
Generator templates SHALL use Handlebars variables: serviceName, pascalCase, upperSnakeCase, port, debugPort, description, workflowName, includeEmail, and includePayment.

#### Scenario: Template variable resolution
- **WHEN** a template contains `{{pascalCase serviceName}}`
- **THEN** the generator SHALL replace it with the PascalCase version of the service name (e.g., "order-tracking" becomes "OrderTracking")

### Requirement: CLI wraps generators with enhanced UX
The ProjectX CLI (`packages/cli`) SHALL wrap the Turborepo generators with input validation, smart defaults, progress spinners, and success messages with next steps.

#### Scenario: CLI vs direct generator
- **WHEN** developer uses `pnpm cli generate service` instead of `pnpm gen:service`
- **THEN** the CLI SHALL provide the same result but with input validation, port auto-suggestion, and formatted output

