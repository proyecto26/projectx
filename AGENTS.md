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
- **Payment Integration**: [docs/payment/README.md](docs/payment/README.md) - Stripe integration guide.
- **Visual Search**: [docs/ai/search/VISUAL_SEARCH.md](docs/ai/search/VISUAL_SEARCH.md) - Image and text search with EmbeddingGemma 2 + pgvector (in progress).

### Domain Rules (Detailed Instructions)
- **Frontend**: [docs/frontend/RULES.md](docs/frontend/RULES.md) (React Router, Components, Styling)
- **Backend**: [docs/backend/RULES.md](docs/backend/RULES.md) (NestJS, DTOs, Modules)
- **Workflows**: [docs/backend/TEMPORAL.md](docs/backend/TEMPORAL.md) (Workflow/Activity patterns, Determinism)
- **Infrastructure**: [docs/architecture/INFRASTRUCTURE.md](docs/architecture/INFRASTRUCTURE.md) (Docker, Deployment)

## ProjectX CLI

The project includes an interactive CLI for scaffolding services and workflows.

### Commands
| Command | Description |
|---------|-------------|
| `pnpm cli` | Interactive mode |
| `pnpm cli generate service` | Create a basic NestJS microservice |
| `pnpm cli generate temporal-service` | Create a NestJS service with Temporal workflows |
| `pnpm cli generate workflow` | Add a workflow to an existing Temporal-enabled service |
| `pnpm cli init` | Initialize/customize the project template |
| `pnpm cli info` | Display project information |

### Code Generators (Turbo)
| Command | Description |
|---------|-------------|
| `pnpm gen:service` | Basic NestJS service generator |
| `pnpm gen:temporal-service` | Temporal-enabled NestJS service generator |
| `pnpm gen:workflow` | Add workflow to existing service |

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
- **New Services**: Use `pnpm cli generate` to scaffold services with proper boilerplate.

### Temporal
- **Determinism**: Workflows MUST be deterministic (no random/time/side-effects).
- **Communication**: Use Signals/Queries for async interaction.
- **Versioning**: Use `patch` or Versioning API for changes to running workflows.
- **New Workflows**: Use `pnpm cli generate workflow` to add workflows to existing services.

## AI Agent Configuration

### Available Skills
Skills are defined in `.agents/skills/` and symlinked to each AI assistant's config:

| Skill | Description |
|-------|-------------|
| `nestjs` | NestJS microservices development |
| `prisma` | Prisma ORM and PostgreSQL operations |
| `react-router-v7` | React Router v7 with SSR |
| `temporal` | Temporal workflow orchestration |
| `turborepo` | Monorepo management |
| `temporal-playground` | Visual workflow builder with LiteGraph.js + temporal-docs MCP |

### Interactive Playgrounds
- **Temporal Workflow Builder**: `pnpm playground` then open `http://localhost:4343/` — Visual node-based workflow designer with LiteGraph.js and Claude chat integration via temporal-playground MCP

### MCP Servers
- `temporal-docs` - Temporal documentation access
- `postgres` - PostgreSQL database access
- `stripe` - Stripe API integration
- `chrome-devtools` / `playwright` - Browser automation
- `context7` - Upstash context management
