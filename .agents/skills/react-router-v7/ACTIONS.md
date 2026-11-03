# Actions and Mutations

## Basic Action Pattern

```tsx
{
  path: "/projects/:id",
  action: async ({ request, params }) => {
    const formData = await request.formData();
    const title = formData.get("title");
    await updateProject(params.id, { title });
    return { success: true };
  },
  Component: Project,
}
```

## Form Submission

```tsx
function Project() {
  const actionData = useActionData();

  return (
    <Form method="post">
      <input type="text" name="title" />
      <button type="submit">Save</button>
      {actionData?.success && <p>Saved!</p>}
    </Form>
  );
}
```

## Redirect After Action

```tsx
import { redirect } from "react-router";

export async function action({ request }) {
  const formData = await request.formData();
  const project = await createProject(formData);
  return redirect(`/projects/${project.id}`);
}
```

## Form Validation

```tsx
import { data } from "react-router";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));

  const errors: Record<string, string> = {};

  if (!email.includes("@")) {
    errors.email = "Invalid email address";
  }
  if (password.length < 12) {
    errors.password = "Password must be at least 12 characters";
  }

  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 }); // 400 prevents revalidation
  }

  return redirect("/dashboard");
}

export default function Signup() {
  const fetcher = useFetcher();
  const errors = fetcher.data?.errors;

  return (
    <fetcher.Form method="post">
      <input type="email" name="email" />
      {errors?.email && <em>{errors.email}</em>}

      <input type="password" name="password" />
      {errors?.password && <em>{errors.password}</em>}

      <button type="submit">Sign Up</button>
    </fetcher.Form>
  );
}
```

## Fetchers (Non-Navigation Mutations)

Use fetchers when you DON'T want URL changes:

```tsx
import { useFetcher } from "react-router";

function TodoItem({ todo }) {
  const fetcher = useFetcher();
  const isDeleting = fetcher.state !== "idle";

  return (
    <li>
      <span>{todo.title}</span>
      <fetcher.Form method="post" action="/todos/delete">
        <input type="hidden" name="id" value={todo.id} />
        <button type="submit" disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </fetcher.Form>
    </li>
  );
}
```

## Optimistic UI with Fetchers

```tsx
function Component() {
  const data = useLoaderData();
  const fetcher = useFetcher();

  // Show optimistic state while submitting
  const title = fetcher.formData?.get("title") || data.title;

  return (
    <div>
      <h1>{title}</h1>
      <fetcher.Form method="post">
        <input type="text" name="title" />
        {fetcher.state !== "idle" && <p>Saving...</p>}
      </fetcher.Form>
    </div>
  );
}
```

## Fetcher for Data Loading (Combobox)

```tsx
function UserSearchCombobox() {
  const fetcher = useFetcher<typeof loader>();

  return (
    <div>
      <fetcher.Form method="get" action="/search-users">
        <input
          type="text"
          name="q"
          onChange={(e) => fetcher.submit(e.currentTarget.form)}
        />
      </fetcher.Form>
      {fetcher.data && (
        <ul style={{ opacity: fetcher.state === "idle" ? 1 : 0.25 }}>
          {fetcher.data.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## Optimistic List Updates

```tsx
function TodoList() {
  const { todos } = useLoaderData();
  const fetcher = useFetcher();

  const displayedTodos = todos.filter(todo => {
    const isDeleting = fetcher.formData?.get("id") === todo.id;
    return !isDeleting;
  });

  return (
    <ul>
      {displayedTodos.map(todo => (
        <li key={todo.id}>
          {todo.title}
          <fetcher.Form method="post" action="/todos/delete">
            <input type="hidden" name="id" value={todo.id} />
            <button type="submit">Delete</button>
          </fetcher.Form>
        </li>
      ))}
    </ul>
  );
}
```
