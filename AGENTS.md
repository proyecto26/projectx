# ProjectX

Full-stack event-driven application using Temporal workflows and React Router v7.

## Tech Stack
- **Package Manager**: `pnpm`
- **Frontend**: React 19, React Router v7, Vite, TailwindCSS (DaisyUI)
- **Backend**: NestJS, PostgreSQL
- **Orchestration**: Temporal
- **Monorepo**: Turbo

## Documentation

### Project Context
- **Architecture Overview**: [docs/architecture/README.md](docs/architecture/README.md) - System design, event flows, and service breakdown.
- **Database Schema**: [docs/backend/DATABASE.md](docs/backend/DATABASE.md) - Prisma models and relationships.

### Domain Rules (Detailed Instructions)
- **Frontend**: [docs/frontend/RULES.md](docs/frontend/RULES.md) (React Router, Components, Styling)
- **Backend**: [docs/backend/RULES.md](docs/backend/RULES.md) (NestJS, DTOs, Modules)
- **Workflows**: [docs/backend/TEMPORAL.md](docs/backend/TEMPORAL.md) (Workflow/Activity patterns, Determinism)
- **Infrastructure**: [docs/architecture/INFRASTRUCTURE.md](docs/architecture/INFRASTRUCTURE.md) (Docker, Deployment)

## Critical Conventions (Always Follow)

### General
- **Linting**: Use `biome` for linting/formatting. Run `pnpm lint:fix` to resolve issues.
- **Type Safety**: Strict TypeScript. Avoid `any`. Use `zod` for validation.
- **Commands**: Run build/dev commands from the root using `pnpm turbo`.

### Frontend
- **Routing**: Use **React Router v7** data APIs (`loader`/`action`).
- **Styling**: **TailwindCSS** utility classes. Avoid inline styles.
- **State**: Server state via **React Query** (TanStack Query).

### Backend
- **Structure**: Modular NestJS architecture.
- **Validation**: `class-validator` and `class-transformer` for DTOs.
- **Database**: Access via `@projectx/db` workspace package.

### Temporal
- **Determinism**: Workflows MUST be deterministic (no random/time/side-effects).
- **Communication**: Use Signals/Queries for async interaction.
- **Versioning**: Use `patch` or Versioning API for changes to running workflows.
