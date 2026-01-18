import { createCookie, createCookieSessionStorage } from "react-router";
import { CSRF } from "remix-utils/csrf/server";

import { sessionSecret } from "@/config/app.config.server";

const globalSession = createCookieSessionStorage({
  cookie: {
    name: "__session",
    secrets: [sessionSecret],
    sameSite: "lax",
  },
});

const ERROR_KEY = "error";
const MESSAGE_KEY = "message";

export async function getGlobalSession(request: Request) {
  const session = await globalSession.getSession(request.headers.get("Cookie"));
  return {
    getError: () => session.get(ERROR_KEY) as string | undefined,
    flashError: (error: string) => session.flash(ERROR_KEY, error),
    getMessage: () => session.get(MESSAGE_KEY) as string | undefined,
    flashMessage: (message: string) => session.flash(MESSAGE_KEY, message),
    commitSession: () => globalSession.commitSession(session),
    destroySession: () => globalSession.destroySession(session),
  };
}

export const csrf = new CSRF({
  cookie: createCookie("csrf", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    secrets: [sessionSecret],
  }),
  secret: sessionSecret,
  formDataKey: "csrf",
});
