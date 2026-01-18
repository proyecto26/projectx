import type { UserDto } from "@projectx/models";
import type React from "react";

import {
  data,
  isRouteErrorResponse,
  Links,
  type LinksFunction,
  Meta,
  type MetaFunction,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useRouteLoaderData,
} from "react-router";
import { ToastContainer } from "react-toastify";
import { AuthenticityTokenProvider } from "remix-utils/csrf/react";
import type { Route } from "./+types/root";
import { getEnv } from "./config/env.server";
import { THEME } from "./constants";
import { getAuthSession } from "./cookies/auth.server";
import { csrf } from "./cookies/session.server";
import {
  useWorkflows,
  withAuthProvider,
  withCartProvider,
  withQueryClientProvider,
  withStoreProvider,
} from "./providers";
import "./styles.css"; // Import global styles here

export const meta: MetaFunction = () => [
  {
    title: "ProjectX App",
  },
];

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
  const [csrfToken, cookieHeader] = await csrf.commitToken();
  const theme = request.headers.get("Cookie")?.includes("theme=dark")
    ? THEME.DARK
    : THEME.LIGHT;
  const { getAuthUser, getAuthAccessToken } = await getAuthSession(request);
  const accessToken = getAuthAccessToken();
  const user = getAuthUser();
  return data(
    {
      user,
      theme,
      csrfToken,
      accessToken,
      ENV: getEnv(),
      isAuthenticated: !!accessToken,
    },
    {
      headers: {
        ...(cookieHeader ? { "Set-Cookie": cookieHeader } : {}),
      },
    },
  );
};

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const { theme } = data ?? {};
  return (
    <html lang="en" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="color-scheme"
          content={theme === THEME.DARK ? "dark light" : "light dark"}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ToastContainer />
        {ENV && (
          <script
            suppressHydrationWarning
            dangerouslySetInnerHTML={{
              __html: String.raw`
                window.ENV = ${JSON.stringify(ENV)};
              `,
            }}
          />
        )}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

type AppProps = {
  csrfToken: string;
  accessToken: string;
  email?: UserDto["email"];
};

function App({ csrfToken, email, accessToken }: AppProps) {
  // Connect Temporal workflows to your app
  useWorkflows({ accessToken, email });

  return (
    <AuthenticityTokenProvider token={csrfToken}>
      <Outlet />
    </AuthenticityTokenProvider>
  );
}

// Compose providers in the correct order
const AppWithProviders = withQueryClientProvider(
  withStoreProvider(withAuthProvider(withCartProvider(App))),
);

export default function ({ loaderData }: Route.ComponentProps) {
  const { user, ...props } = loaderData;
  return <AppWithProviders {...props} email={user?.email} />;
}

export const ErrorBoundary = () => {
  const error = useRouteError();

  return (
    <div>
      {isRouteErrorResponse(error) ? (
        <div>
          <h1>
            {error.status} {error.statusText}
          </h1>
          <p>{error.data}</p>
        </div>
      ) : error instanceof Error ? (
        <div>
          <h1>Error</h1>
          <p>{error.message}</p>
          <p>The stack trace is:</p>
          <pre>{error.stack}</pre>
        </div>
      ) : (
        <h1>Unknown Error</h1>
      )}
    </div>
  );
};
