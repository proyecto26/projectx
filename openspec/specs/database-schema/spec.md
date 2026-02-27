# database-schema Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: PostgreSQL with PostGIS via Prisma ORM
The database layer SHALL use PostgreSQL with PostGIS extension, accessed through Prisma ORM v7 with the repository pattern provided by `@projectx/db`.

#### Scenario: Running migrations
- **WHEN** developer runs `pnpm prisma:migrate:dev`
- **THEN** Prisma SHALL apply pending migrations to the PostgreSQL database

#### Scenario: Generating Prisma client
- **WHEN** developer runs `pnpm prisma:generate`
- **THEN** Prisma SHALL generate a typed client from the schema for use by all services

### Requirement: Repository pattern via @projectx/db
Database access SHALL be abstracted through repository services in the `@projectx/db` package. Services SHALL NOT query the database directly but through repository methods.

#### Scenario: Service database access
- **WHEN** a service needs to query or mutate data
- **THEN** it SHALL use repository services from `@projectx/db` injected via NestJS dependency injection

### Requirement: Database seeding
The system SHALL provide a seed script to populate the database with initial/test data.

#### Scenario: Seeding the database
- **WHEN** developer runs `pnpm prisma:seed`
- **THEN** the database SHALL be populated with initial data for development and testing

