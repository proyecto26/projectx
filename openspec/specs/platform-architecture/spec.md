# platform-architecture Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: Monorepo structure using Turborepo
The system SHALL be organized as a Turborepo monorepo with `apps/` for deployable services and `packages/` for shared libraries. All workspace packages SHALL use the `@projectx/` npm scope.

#### Scenario: Building all packages
- **WHEN** developer runs `pnpm build` from the project root
- **THEN** Turborepo SHALL build all packages respecting dependency order and caching

#### Scenario: Running a specific service
- **WHEN** developer runs `pnpm dev:<serviceName>`
- **THEN** only that service and its dependencies SHALL start in development mode

### Requirement: NestJS microservice architecture
The system SHALL use NestJS for all backend services. Each service SHALL be an independent NestJS application in `apps/` with its own port, Swagger docs, and module structure.

#### Scenario: Service independence
- **WHEN** a new service is created
- **THEN** it SHALL have its own `package.json`, `tsconfig.json`, `nest-cli.json`, and entry point at `src/main.ts`

#### Scenario: Shared module consumption
- **WHEN** a service needs shared functionality
- **THEN** it SHALL import from `@projectx/core`, `@projectx/db`, or `@projectx/models` workspace packages

### Requirement: Service communication via HTTP/REST
Backend services SHALL communicate with each other via HTTP/REST APIs. Each service SHALL expose a configurable API prefix matching its service name.

#### Scenario: Cross-service API call
- **WHEN** the order service needs to verify authentication
- **THEN** it SHALL make an HTTP request to the auth service's REST API

### Requirement: Docker-based development environment
The system SHALL provide a `docker-compose.yml` that starts all infrastructure services (PostgreSQL with PostGIS, Temporal server + UI, Elasticsearch) and optionally the application services.

#### Scenario: Starting infrastructure
- **WHEN** developer runs `docker-compose up -d`
- **THEN** PostgreSQL, Temporal server, Temporal UI, and Elasticsearch SHALL be available

### Requirement: TypeScript strict mode throughout
All packages and services SHALL use TypeScript with strict mode enabled. The `any` type SHALL be avoided; `zod` SHALL be used for runtime validation.

#### Scenario: Type checking
- **WHEN** developer runs `pnpm typecheck`
- **THEN** all packages SHALL pass TypeScript strict mode compilation

### Requirement: Biome for linting and formatting
The system SHALL use Biome (not ESLint/Prettier) for code linting and formatting. Husky and lint-staged SHALL enforce checks on pre-commit.

#### Scenario: Fixing lint issues
- **WHEN** developer runs `pnpm lint:fix`
- **THEN** Biome SHALL auto-fix all fixable linting and formatting issues across the monorepo

