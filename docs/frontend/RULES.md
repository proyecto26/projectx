# Frontend Rules (Web)

## React Router v7

### Routing & Data
- **Loaders**: Use `loader` functions for server-side data fetching.
- **Actions**: Use `action` functions for mutations/form submissions.
- **Error Boundaries**: Implement `ErrorBoundary` components for route-level error handling.
- **Meta**: Use `meta` functions for SEO tags.

Example:
```tsx
export async function loader({ request }: LoaderFunctionArgs) {
  return { user: await getUser(request) };
}

export default function Page({ loaderData }: Route.ComponentProps) {
  return <h1>Hello {loaderData.user.name}</h1>;
}
```

## Tech Stack
- **Framework**: React 19 + Vite
- **Styling**: TailwindCSS (v4) + DaisyUI
- **State**: React Query (Server State), URL/Loaders (Route State), Context (Global UI State).

## Conventions

### Component Design
- **Functional**: Use React functional components.
- **Typing**: strictly type props and hooks.
- **Location**:
  - `pages/`: Route components.
  - `components/`: Reusable UI components.
  - `hooks/`: Custom React hooks.

### Styling
- **Utility Classes**: Prefer standard Tailwind classes over custom CSS.
- **Structure**:
  ```tsx
  <div className="flex flex-col items-center p-4">...</div>
  ```
- **Animations**: Use `framer-motion` for complex interactions.

### Environment
- **Server**: Access `process.env` in loaders/actions.
- **Client**: Access `window.ENV` in components (only if strictly necessary; prefer passing data via loaders).
