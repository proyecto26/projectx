# frontend-app Specification

## Purpose
TBD - created by archiving change projectx-platform-spec. Update Purpose after archive.
## Requirements
### Requirement: React Router v7 with SSR
The frontend SHALL use React Router v7 in framework mode with server-side rendering enabled. Routes SHALL use data APIs (loader/action) for server-side data fetching.

#### Scenario: Page load with SSR
- **WHEN** a user navigates to a route
- **THEN** the server SHALL execute the route's loader, render the page with data, and send the complete HTML to the client

#### Scenario: Client-side navigation
- **WHEN** a user clicks an internal link after initial load
- **THEN** React Router SHALL handle navigation client-side, calling loaders via fetch requests

### Requirement: TanStack Query for server state management
The frontend SHALL use TanStack Query (React Query) for server state management, caching, and background refetching.

#### Scenario: Data fetching with caching
- **WHEN** a component needs server data
- **THEN** it SHALL use TanStack Query hooks which provide automatic caching, deduplication, and background refetching

### Requirement: TailwindCSS v4 with DaisyUI
The frontend SHALL use TailwindCSS v4 for styling with DaisyUI as the component library. Inline styles SHALL be avoided in favor of utility classes.

#### Scenario: Styling a component
- **WHEN** a developer creates a new UI component
- **THEN** it SHALL use TailwindCSS utility classes and DaisyUI component classes for styling

### Requirement: Component library from @projectx/ui
Reusable React components SHALL be maintained in the `@projectx/ui` package and documented with Storybook.

#### Scenario: Using a shared component
- **WHEN** the frontend needs a reusable UI element
- **THEN** it SHALL import from `@projectx/ui` which provides consistently styled, documented components

#### Scenario: Viewing component documentation
- **WHEN** a developer runs `pnpm run storybook`
- **THEN** Storybook SHALL display all `@projectx/ui` components with interactive examples

### Requirement: Framer Motion for animations
The frontend SHALL use Framer Motion for UI animations and transitions.

#### Scenario: Page transitions
- **WHEN** a user navigates between routes
- **THEN** Framer Motion SHALL provide smooth transition animations

