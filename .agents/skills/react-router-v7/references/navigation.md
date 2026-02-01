# Navigation Patterns

## Contents

- [Project-Specific Navigation](#project-specific-navigation)
- [NavLink (Active Styling)](#navlink-active-styling)
- [Link (No Active Styling)](#link-no-active-styling)
- [Programmatic Navigation](#programmatic-navigation)
- [Redirect in Loaders](#redirect-in-loaders)
- [Pending UI (Navigation State)](#pending-ui-navigation-state)
- [Form Submission State](#form-submission-state)
- [Index Routes](#index-routes)
- [Layout Routes (No Path)](#layout-routes-no-path)
- [Navigate Component](#navigate-component)

---

## Project-Specific Navigation

Using DaisyUI and TailwindCSS for navigation styling:

```tsx
import { Link, NavLink, useNavigate } from "react-router";
import { classnames } from "~/lib/classnames"; // includes tailwind-merge

function Navigation() {
  const navigate = useNavigate();

  return (
    <nav className="navbar bg-base-100 shadow-lg">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">ProjectX</Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          {/* NavLink with DaisyUI active styling */}
          <li>
            <NavLink
              to="/products"
              className={({ isActive }) =>
                classnames("btn btn-ghost", isActive && "btn-active")
              }
            >
              Products
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                classnames("btn btn-ghost", isActive && "btn-active")
              }
            >
              Orders
            </NavLink>
          </li>
        </ul>

        {/* Programmatic navigation with button */}
        <button
          className="btn btn-primary"
          onClick={() => navigate("/checkout")}
        >
          Checkout
        </button>
      </div>
    </nav>
  );
}
```

## NavLink (Active Styling)

```tsx
import { NavLink } from "react-router";

<NavLink to="/messages" end>
  Messages
</NavLink>

// CSS styling
a.active { color: red; }
a.pending { animation: pulse 1s infinite; }

// Callback styling with classnames utility
<NavLink
  to="/messages"
  className={({ isActive, isPending }) =>
    classnames(
      "btn btn-ghost",
      isActive && "btn-active",
      isPending && "loading"
    )
  }
>
  Messages
</NavLink>
```

## Link (No Active Styling)

```tsx
import { Link } from "react-router";

<Link to="/login">Login</Link>
<Link to={{ pathname: "/search", search: "?q=term" }}>Search</Link>
```

## Programmatic Navigation

```tsx
import { useNavigate } from "react-router";

function Component() {
  const navigate = useNavigate();

  // Use sparingly - only for non-user-initiated navigation
  useEffect(() => {
    if (inactivityTimeout) {
      navigate("/logout");
    }
  }, [inactivityTimeout]);

  // Or with options
  navigate("/dashboard", { replace: true });
  navigate(-1); // Go back
}
```

## Redirect in Loaders

```tsx
import { redirect } from "react-router";

export async function loader({ request }) {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }
  return { user };
}
```

## Pending UI (Navigation State)

```tsx
import { useNavigation } from "react-router";

function Root() {
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  return (
    <div>
      {isNavigating && <GlobalSpinner />}
      <Outlet />
    </div>
  );
}
```

## Form Submission State

```tsx
function Component() {
  const navigation = useNavigation();
  const isSubmitting = navigation.formAction === "/recipes/new";

  return (
    <Form method="post" action="/recipes/new">
      <button type="submit">
        {isSubmitting ? "Saving..." : "Create Recipe"}
      </button>
    </Form>
  );
}
```

## Index Routes

```tsx
createBrowserRouter([
  {
    path: "/dashboard",
    Component: Dashboard,
    children: [
      { index: true, Component: DashboardHome }, // Renders at /dashboard
      { path: "settings", Component: Settings }, // Renders at /dashboard/settings
    ],
  },
]);
```

## Layout Routes (No Path)

```tsx
createBrowserRouter([
  {
    Component: MarketingLayout, // No path, just layout wrapper
    children: [
      { index: true, Component: Home },
      { path: "contact", Component: Contact },
    ],
  },
]);
```

## Navigate Component

```tsx
import { Navigate, useLocation } from "react-router";

function RequireAuth({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
```
