# Advanced Patterns

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

### Middleware (Framework Mode)

```tsx
import { redirect } from "react-router";

async function authMiddleware({ context, request }) {
  const userId = getUserId(request);

  if (!userId) {
    throw redirect("/login");
  }

  const user = await getUserById(userId);
  context.set(userContext, user);
}

createBrowserRouter([
  {
    path: "/dashboard",
    middleware: [authMiddleware],
    Component: Dashboard,
  },
]);
```

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
