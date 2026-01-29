# Advanced Patterns

## Contents

- [Project-Specific Error Handling](#project-specific-error-handling)
- [Project-Specific Protected Routes](#project-specific-protected-routes)
- [Error Boundaries](#error-boundaries)
  - [Root Error Boundary (Required)](#root-error-boundary-required)
  - [Throwing Errors in Loaders](#throwing-errors-in-loaders)
  - [Nested Error Boundaries](#nested-error-boundaries)
- [Protected Routes](#protected-routes)
  - [Component-Based Protection](#component-based-protection)
  - [Middleware (Framework Mode)](#middleware-framework-mode)
- [Lazy Loading / Code Splitting](#lazy-loading--code-splitting)
  - [Data Mode Lazy Loading](#data-mode-lazy-loading)
  - [Declarative Mode Lazy Loading](#declarative-mode-lazy-loading)
- [Common Route Patterns](#common-route-patterns)
  - [Optional Segments](#optional-segments)
  - [Catch-All / Splat Routes](#catch-all--splat-routes)
  - [Multiple Params](#multiple-params)
- [Index vs Path Routes](#index-vs-path-routes)

---

## Project-Specific Error Handling

Using DaisyUI alert components for error display:

```tsx
import { useRouteError, isRouteErrorResponse, Link } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body text-center">
            <h1 className="text-6xl font-bold text-error">{error.status}</h1>
            <h2 className="text-2xl font-semibold">{error.statusText}</h2>
            <p className="text-base-content/70">{error.data}</p>
            <div className="card-actions justify-center mt-4">
              <Link to="/" className="btn btn-primary">Go Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="alert alert-error">
      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        {error instanceof Error ? error.message : "An unexpected error occurred"}
      </span>
    </div>
  );
}
```

## Project-Specific Protected Routes

Using the auth utilities from `~/cookies/auth.server.ts`:

```tsx
// In loader - redirect if not authenticated
import { redirect } from "react-router";
import { getAuthSession, getAccessTokenOrRedirect } from "~/cookies/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  // Method 1: Manual check with custom redirect
  const session = await getAuthSession(request);
  if (!session.user) {
    const url = new URL(request.url);
    return redirect(`/auth/login?redirectTo=${url.pathname}`);
  }

  // Method 2: Auto-redirect helper (throws redirect)
  const accessToken = await getAccessTokenOrRedirect(request);

  return { user: session.user };
}

// In action - logout
import { logoutRedirect } from "~/cookies/auth.server";

export async function action({ request }: Route.ActionArgs) {
  return logoutRedirect(request);
}
```

## Error Boundaries

### Root Error Boundary (Required)

```tsx
import { useRouteError, isRouteErrorResponse } from "react-router";

function RootErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <>
        <h1>{error.status} {error.statusText}</h1>
        <p>{error.data}</p>
      </>
    );
  } else if (error instanceof Error) {
    return (
      <div>
        <h1>Error</h1>
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    );
  } else {
    return <h1>Unknown Error</h1>;
  }
}

createBrowserRouter([
  {
    path: "/",
    ErrorBoundary: RootErrorBoundary,
    Component: Root,
  },
]);
```

### Throwing Errors in Loaders

```tsx
import { data } from "react-router";

export async function loader({ params }) {
  const record = await db.getRecord(params.id);
  if (!record) {
    throw data("Record Not Found", { status: 404 });
  }
  return record;
}
```

### Nested Error Boundaries

```tsx
createBrowserRouter([
  {
    path: "/app",
    ErrorBoundary: AppErrorBoundary,
    children: [
      {
        path: "invoices/:id",
        ErrorBoundary: InvoiceErrorBoundary,
        Component: Invoice,
      },
    ],
  },
]);
```

## Protected Routes

### Component-Based Protection

```tsx
import { Navigate, useLocation } from "react-router";

function RequireAuth({ children }: { children: JSX.Element }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Route configuration
{
  path: "/protected",
  element: (
    <RequireAuth>
      <ProtectedPage />
    </RequireAuth>
  ),
}

// In login handler - redirect back
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  function handleLogin() {
    auth.signin(() => {
      navigate(from, { replace: true });
    });
  }
}
```

### Middleware (Framework Mode Only)

Middleware requires Framework Mode and the `future.v8_middleware` flag. Export middleware from route modules:

```tsx
// app/routes/dashboard.tsx (Framework Mode)
import { redirect, createContext } from "react-router";

export const userContext = createContext<User | null>(null);

export const middleware = [
  async function authMiddleware({ request, context }, next) {
    const userId = getUserId(request);

    if (!userId) {
      throw redirect("/login");
    }

    const user = await getUserById(userId);
    context.set(userContext, user);

    return next();
  },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return { user };
}
```

Note: Middleware is NOT available in Data Mode (createBrowserRouter). Use loaders for auth checks in Data Mode.

## Lazy Loading / Code Splitting

### Data Mode Lazy Loading

```tsx
createBrowserRouter([
  {
    path: "/app",
    lazy: async () => {
      const [Component, loader] = await Promise.all([
        import("./app"),
        import("./app-loader"),
      ]);
      return { Component, loader };
    },
  },
]);
```

### Declarative Mode Lazy Loading

```tsx
import React from "react";

const About = React.lazy(() => import("./pages/About"));

<Routes>
  <Route
    path="about"
    element={
      <React.Suspense fallback={<>Loading...</>}>
        <About />
      </React.Suspense>
    }
  />
</Routes>
```

## Common Route Patterns

### Optional Segments

```tsx
{ path: ":lang?/categories" }     // Optional dynamic segment
{ path: "users/:userId/edit?" }   // Optional static segment at end
```

### Catch-All / Splat Routes

```tsx
{ path: "files/*" }

// Access splat in loader
loader: ({ params }) => {
  const filePath = params["*"]; // "path/to/file.txt"
}
```

### Multiple Params

```tsx
{ path: "users/:userId/posts/:postId" }

// params.userId, params.postId available in loader/component
```

## Index vs Path Routes

```tsx
createBrowserRouter([
  {
    path: "/dashboard",
    Component: Dashboard,
    children: [
      // Index route - renders when parent path matches exactly
      { index: true, Component: DashboardHome },

      // Path route - renders at parent + path
      { path: "settings", Component: Settings },
      { path: "profile", Component: Profile },
    ],
  },
]);
```

**Index renders at**: `/dashboard`
**Settings renders at**: `/dashboard/settings`
