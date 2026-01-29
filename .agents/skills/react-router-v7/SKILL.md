---
name: react-router-v7
description: React Router v7 full-stack development with SSR. Use when working with routes, loaders, actions, SSR, Form components, fetchers, navigation guards, protected routes, URL search params, or the web app in apps/web.
allowed-tools: Read, Grep, Glob, Edit, Write
---

# React Router v7 Best Practices

## Project Structure

The frontend app is in `apps/web/` using React Router v7 with SSR (Framework Mode).

```
apps/web/
├── src/
│   ├── routes/           # File-based routing
│   │   ├── layouts/      # Layout routes (root, auth, admin)
│   │   ├── admin/        # Admin routes
│   │   └── _index.tsx    # Home page
│   ├── pages/            # Page components
│   ├── components/       # Shared components
│   ├── services/         # API services (http.server.ts)
│   ├── cookies/          # Session management (auth.server.ts)
│   ├── lib/              # Utilities and helpers
│   ├── root.tsx          # Root layout
│   └── entry.server.tsx  # Server entry
├── react-router.config.ts
└── vite.config.ts
```

## File-Based Routing

Routes are defined by file structure in `src/routes/`:

| File | Route |
|------|-------|
| `_index.tsx` | `/` |
| `about.tsx` | `/about` |
| `products.tsx` | `/products` |
| `products.$id.tsx` | `/products/:id` |
| `products._index.tsx` | `/products` (index) |
| `auth.login.tsx` | `/auth/login` |
| `admin/index.tsx` | `/admin` |
| `$.tsx` | Catch-all (404) |

### Layout Routes

```
routes/
├── layouts/
│   ├── root-layout.tsx   # Root layout with Outlet
│   └── auth-layout.tsx   # Auth layout (login/register)
├── products.tsx          # Layout for /products/*
├── products._index.tsx   # /products
└── products.$id.tsx      # /products/:id
```

## Quick Reference

**Framework Mode (This Project - Vite plugin with SSR)**:
```ts
// routes.ts
import { index, route, layout } from "@react-router/dev/routes";

export default [
  layout("./routes/layouts/root-layout.tsx", [
    index("./routes/_index.tsx"),
    route("products/:pid", "./routes/products.$id.tsx"),
    route("admin/*", "./routes/admin/index.tsx"),
  ]),
];
```

**Data Mode (Alternative for SPAs)**:
```tsx
import { createBrowserRouter, RouterProvider } from "react-router";

const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    ErrorBoundary: RootErrorBoundary,
    loader: rootLoader,
    children: [
      { index: true, Component: Home },
      { path: "products/:productId", Component: Product, loader: productLoader },
    ],
  },
]);

ReactDOM.createRoot(root).render(<RouterProvider router={router} />);
```

## Route Configuration

### Nested Routes with Outlets

```tsx
createBrowserRouter([
  {
    path: "/dashboard",
    Component: Dashboard,
    children: [
      { index: true, Component: DashboardHome },
      { path: "settings", Component: Settings },
    ],
  },
]);

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Outlet /> {/* Renders child routes */}
    </div>
  );
}
```

### Dynamic Segments and Splats

```tsx
{ path: "teams/:teamId" }           // params.teamId
{ path: ":lang?/categories" }       // Optional segment
{ path: "files/*" }                 // Splat: params["*"]
```

## SSR-First Architecture (CRITICAL)

**Core Principle**: Always use loaders for data fetching, actions for mutations.

```tsx
// app/routes/products.$id.tsx
import type { Route } from "./+types/products.$id";

// ALWAYS use loaders for server-side data fetching
export async function loader({ params }: Route.LoaderArgs) {
  const product = await fetchProduct(params.id);
  if (!product) {
    throw new Response("Not Found", { status: 404 });
  }
  return { product };
}

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.product.name ?? "Product" },
    { name: "description", content: data?.product.description },
  ];
}

// Component receives data via props (loaderData)
export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { product } = loaderData;

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>${product.price}</span>
    </div>
  );
}
```

## Authentication Utilities

Use the auth utilities from `apps/web/src/cookies/auth.server.ts`:

```tsx
import { getAuthSession, getAccessTokenOrRedirect, logoutRedirect } from "~/cookies/auth.server";

// In loaders - get session with user info
export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAuthSession(request);

  // Auto-redirect to login if not authenticated
  const accessToken = await getAccessTokenOrRedirect(request);

  // Use token for API calls
  const data = await authRequest('/api/orders', accessToken);
  return { data, user: session.user };
}

// In actions - logout
export async function action({ request }: Route.ActionArgs) {
  return logoutRedirect(request);
}
```

## HTTP Service Utilities

Use utilities from `apps/web/src/services/http.server.ts`:

```tsx
import { httpRequest, authRequest } from "~/services/http.server";

// Public endpoints (no auth required)
const products = await httpRequest('/api/products');

// Protected endpoints (auto-adds Bearer token)
const orders = await authRequest('/api/orders', accessToken);

// With options
const data = await authRequest('/api/data', accessToken, {
  method: 'POST',
  body: JSON.stringify(payload),
});
```

**Features**:
- Automatic 4-second timeout with retry support
- Custom error handling with `errorHandler` option
- Use `defaultResponse` pattern for graceful timeout handling

## TanStack Query Integration (SSR Pattern)

Use React Query ONLY for retry logic when loader times out:

```tsx
import { useQuery } from "@tanstack/react-query";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAuthSession(request);
  const data = await authRequest('/api/stats', session.accessToken);
  return { stats: data ?? defaultResponse }; // defaultResponse on timeout
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  // React Query with loader data as initialData
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    initialData: loaderData.stats,
    enabled: loaderData.stats === undefined, // Only fetch if loader timed out
    staleTime: 60_000, // 1 minute
  });

  if (isLoading) return <Skeleton />;
  return <StatsDisplay stats={stats} />;
}
```

## Route with Action (Form Handling)

```tsx
// app/routes/products.new.tsx
import type { Route } from "./+types/products.new";
import { Form, redirect, useActionData } from "react-router";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const price = parseFloat(formData.get("price") as string);

  // Server-side validation
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Name is required";
  if (isNaN(price)) errors.price = "Valid price is required";

  if (Object.keys(errors).length) {
    return { errors };
  }

  const product = await createProduct({ name, price });
  return redirect(`/products/${product.id}`);
}

export default function NewProduct({ actionData }: Route.ComponentProps) {
  const errors = actionData?.errors;

  return (
    <Form method="post">
      <div>
        <label htmlFor="name">Name</label>
        <input type="text" name="name" id="name" />
        {errors?.name && <span className="error">{errors.name}</span>}
      </div>
      <div>
        <label htmlFor="price">Price</label>
        <input type="number" name="price" id="price" step="0.01" />
        {errors?.price && <span className="error">{errors.price}</span>}
      </div>
      <button type="submit">Create Product</button>
    </Form>
  );
}
```

## Component Library Integration

Use components from `@projectx/ui`:

```tsx
import { Button, Card, Input } from "@projectx/ui";

export default function ProductForm() {
  return (
    <Card>
      <Form method="post">
        <Input label="Product Name" name="name" required />
        <Button type="submit">Save</Button>
      </Form>
    </Card>
  );
}
```

## Styling with Tailwind CSS v4

Use utility classes and DaisyUI components:

```tsx
import { classnames } from "~/lib/classnames"; // includes tailwind-merge

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title text-lg font-semibold">{product.name}</h3>
        <p className="text-base-content/70">{product.description}</p>
        <span className="text-xl font-bold text-primary">
          ${product.price}
        </span>
        <div className="card-actions justify-end">
          <button className="btn btn-primary">Buy Now</button>
        </div>
      </div>
    </div>
  );
}
```

**DaisyUI Components**: `btn`, `card`, `alert`, `badge`, `modal`, `drawer`, `navbar`

## Error Handling

```tsx
import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="alert alert-error">
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </div>
    );
  }

  return (
    <div className="alert alert-error">
      <h1>Something went wrong</h1>
      <p>{error instanceof Error ? error.message : "Unknown error"}</p>
    </div>
  );
}
```

## Navigation

```tsx
import { Link, NavLink, useNavigate } from "react-router";

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav className="navbar bg-base-100">
      {/* Basic link */}
      <Link to="/products" className="btn btn-ghost">Products</Link>

      {/* Active state styling */}
      <NavLink
        to="/products"
        className={({ isActive }) =>
          classnames("btn btn-ghost", isActive && "btn-active")
        }
      >
        Products
      </NavLink>

      {/* Programmatic navigation */}
      <button className="btn btn-primary" onClick={() => navigate("/checkout")}>
        Go to Checkout
      </button>
    </nav>
  );
}
```

## Key Decision Points

### Form vs Fetcher

**Use `<Form>`**: Creating/deleting with URL change, adding to history
**Use `useFetcher`**: Inline updates, list operations, popovers - no URL change

### Loader vs useEffect

**Use loader**: Data before render, server-side fetch, automatic revalidation
**Use useEffect**: Client-only data, user-interaction dependent, subscriptions

## Running the Frontend

```bash
# Development with HMR
pnpm dev:web

# Build for production
pnpm build:web

# Type checking
pnpm --filter web typecheck

# Run Storybook for components
pnpm storybook
```

## Best Practices

1. **ALWAYS use loaders** for server-side data fetching (SSR-first)
2. **ALWAYS use actions** for form submissions and mutations
3. **Use `authRequest`/`httpRequest`** from services for API calls
4. **Pass `initialData`** to React Query from loader data
5. **Use `enabled: initialData === undefined`** to avoid duplicate requests
6. **Handle errors** with ErrorBoundary components
7. **Type routes** using the generated `+types` files
8. **Use Form component** for progressive enhancement
9. **Validate on server**, return errors via action
10. **Keep components pure** - receive data via props

## Additional Documentation

- **Data Loading**: See [LOADERS.md](LOADERS.md) for loader patterns, parallel loading, search params
- **Mutations**: See [ACTIONS.md](ACTIONS.md) for actions, Form, fetchers, validation
- **Navigation**: See [NAVIGATION.md](NAVIGATION.md) for Link, NavLink, programmatic nav
- **Advanced**: See [ADVANCED.md](ADVANCED.md) for error boundaries, protected routes, lazy loading

## Mode Comparison

| Feature | Framework Mode | Data Mode | Declarative Mode |
|---------|---------------|-----------|------------------|
| Setup | Vite plugin | `createBrowserRouter` | `<BrowserRouter>` |
| Type Safety | Auto-generated types | Manual | Manual |
| SSR Support | Built-in | Manual | Limited |
| Use Case | Full-stack apps (this project) | SPAs with control | Simple/legacy |
