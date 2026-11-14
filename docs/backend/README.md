# Backend (Turborepo)

## Common scripts

- Install: `pnpm install`
- Build all: `pnpm build` (runs `turbo run build`)
- Dev (per app):
  - Auth: `pnpm --filter auth dev`
  - Order: `pnpm --filter order dev`
  - Product: `pnpm --filter product dev`
- Lint/format: `pnpm check` (Biome)

## Prisma

- Generate: `pnpm --filter @projectx/db run prisma:generate`
- Migrate (deploy): `pnpm --filter @projectx/db run prisma:migrate`
- Seed: `pnpm --filter @projectx/db run prisma:seed`

## Temporal

- Temporal services are managed via `docker-compose.yml`. Ensure `db`, `temporal`, `temporal-ui`, and `temporal-admin-tools` are running.

## Debugging

- Attach to ports: Auth 9229, Order 9230, Product 9231 (see `.vscode/launch.json`).