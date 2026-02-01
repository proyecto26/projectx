# Data Loading Patterns

## SSR-First Principle (CRITICAL)

**Always use loaders for initial data fetching.** This ensures:
- Server-side rendering for SEO
- No hydration mismatches
- Automatic revalidation on navigation
- Better performance (data ready before render)

## Project-Specific Loader Pattern

```tsx
// app/routes/orders._index.tsx
import type { Route } from "./+types/orders._index";
import { getAuthSession, getAccessTokenOrRedirect } from "~/cookies/auth.server";
import { authRequest } from "~/services/http.server";

const defaultResponse = { orders: [], total: 0 };

export async function loader({ request }: Route.LoaderArgs) {
  // Get auth session (includes user, tokens, flash messages)
  const session = await getAuthSession(request);

  // Auto-redirect to login if not authenticated
  const accessToken = await getAccessTokenOrRedirect(request);

  // Fetch data using auth service (4-second timeout)
  const data = await authRequest('/api/orders', accessToken);

  // Return with defaultResponse fallback for timeouts
  return { orders: data ?? defaultResponse, user: session.user };
}

export default function OrdersPage({ loaderData }: Route.ComponentProps) {
  const { orders, user } = loaderData;
  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <OrderList orders={orders} />
    </div>
  );
}
```

## Basic Loader (Generic)

```tsx
{
  path: "/teams/:teamId",
  loader: async ({ params, request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const team = await fetchTeam(params.teamId, query);
    return { team, name: team.name };
  },
  Component: Team,
}

function Team() {
  const data = useLoaderData();
  return <h1>{data.name}</h1>;
}
```

## Parallel Data Loading

Nested routes load data in parallel automatically:

```tsx
createBrowserRouter([
  {
    path: "/",
    loader: rootLoader,    // Loads in parallel
    children: [
      {
        path: "project/:id",
        loader: projectLoader, // Loads in parallel with rootLoader
      },
    ],
  },
]);
```

## Search Params in Loaders

```tsx
{
  path: "/search",
  loader: async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const page = url.searchParams.get("page") || "1";
    return { results: await search(query, parseInt(page)) };
  },
}

function SearchPage() {
  const { results } = useLoaderData();
  return (
    <Form method="get">
      <input type="text" name="q" />
      <button type="submit">Search</button>
    </Form>
  );
}
```

## useSearchParams Hook

```tsx
import { useSearchParams } from "react-router";

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q");

  return (
    <input
      value={query || ""}
      onChange={(e) => setSearchParams({ q: e.target.value })}
    />
  );
}
```

## Revalidation Control

```tsx
function shouldRevalidate({ currentUrl, nextUrl, formAction }) {
  return currentUrl.pathname !== nextUrl.pathname;
}

createBrowserRouter([
  {
    path: "/data",
    shouldRevalidate,
    loader: dataLoader,
  },
]);
```

## Framework Mode Loaders

```tsx
// product.tsx
import { Route } from "./+types/product";

export async function loader({ params }: Route.LoaderArgs) {
  const product = await getProduct(params.pid);
  return { product };
}

export default function Product({ loaderData }: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

## TanStack Query SSR Integration

Use React Query ONLY for retry logic when loader times out:

```tsx
import { useQuery } from "@tanstack/react-query";
import type { Route } from "./+types/dashboard";
import { getAuthSession } from "~/cookies/auth.server";
import { authRequest } from "~/services/http.server";

const defaultResponse = undefined; // Indicates timeout

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAuthSession(request);
  const stats = await authRequest('/api/stats', session.accessToken);
  return { stats: stats ?? defaultResponse };
}

export default function Dashboard({ loaderData }: Route.ComponentProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/stats").then((r) => r.json()),
    initialData: loaderData.stats,
    // CRITICAL: Only fetch if loader timed out (returned undefined)
    enabled: loaderData.stats === undefined,
    staleTime: 60_000, // 1 minute
  });

  if (isLoading) return <Skeleton />;
  return <StatsDisplay stats={stats} />;
}
```

**Key Pattern**:
1. Loader fetches data server-side
2. Pass loader data as `initialData` to React Query
3. Set `enabled: initialData === undefined`
4. React Query only fetches if loader timed out

## Protected Route Loader

```tsx
import { redirect } from "react-router";
import { getAuthSession } from "~/cookies/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getAuthSession(request);

  if (!session.user) {
    // Store current URL for redirect after login
    const url = new URL(request.url);
    return redirect(`/auth/login?redirectTo=${url.pathname}`);
  }

  return { user: session.user };
}
```
