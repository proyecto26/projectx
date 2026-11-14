# Frontend (Turborepo)

## Common scripts

- Install: `pnpm install`
- Build all: `pnpm build` (runs `turbo run build`)
- Dev web: `pnpm --filter web dev`
- Storybook: `pnpm --filter storybook dev`
- Lint/format: `pnpm check` (Biome)

## UI package

- Build: `pnpm --filter @projectx/ui build`
- Test: `pnpm --filter @projectx/ui test`
- Styles: import `@projectx/ui/styles` from apps. Tailwind is configured in the app via `@tailwindcss/vite`.