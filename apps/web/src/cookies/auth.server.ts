import { UserDto } from "@projectx/models";
import { plainToInstance } from "class-transformer";
import isEmpty from "lodash/isEmpty";
import isObject from "lodash/isObject";
import { createCookieSessionStorage, redirect } from "react-router";

import { sessionSecret } from "../config/app.config.server";

const authStorage = createCookieSessionStorage({
  cookie: {
    name: "__auth",
    secure: process.env.NODE_ENV !== "development",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 26, // 26 days
    httpOnly: true,
  },
});

const USER_KEY = "user";
const ACCESS_TOKEN_KEY = "accessToken";
const ERROR_KEY = "error";
const MESSAGE_KEY = "message";

export async function getAuthSession(request: Request) {
  const session = await authStorage.getSession(request.headers.get("Cookie"));
  return {
    getAuthUser: () => {
      const user = session.get(USER_KEY);
      return isEmpty(user)
        ? undefined
        : (plainToInstance(UserDto, isObject(user) ? user : JSON.parse(user), {
            excludeExtraneousValues: true,
          }) as unknown as UserDto);
    },
    setAuthUser: (value: UserDto) => session.set(USER_KEY, value),
    getAuthAccessToken: () => session.get(ACCESS_TOKEN_KEY) as string,
    setAuthAccessToken: (accessToken: string) =>
      session.set(ACCESS_TOKEN_KEY, accessToken),
    getError: () => session.get(ERROR_KEY) as string | undefined,
    flashError: (error: string) => session.flash(ERROR_KEY, error),
    getMessage: () => session.get(MESSAGE_KEY) as string | undefined,
    flashMessage: (message: string) => session.flash(MESSAGE_KEY, message),
    clean: () => {
      session.unset(USER_KEY);
      session.unset(ACCESS_TOKEN_KEY);
      session.unset(ERROR_KEY);
      session.unset(MESSAGE_KEY);
    },
    commitSession: () => authStorage.commitSession(session),
    destroySession: () => authStorage.destroySession(session),
  };
}

export const logoutRedirect = async (request: Request) => {
  const { commitSession, clean, flashMessage } = await getAuthSession(request);
  clean();
  flashMessage("logout");
  return redirect("/login", {
    headers: {
      "Set-Cookie": await commitSession(),
    },
  });
};

// Logout the user if the token is empty
export const getAccessTokenOrRedirect = async (request: Request) => {
  const { getAuthAccessToken } = await getAuthSession(request);
  const accessToken = getAuthAccessToken();
  if (!accessToken) {
    throw await logoutRedirect(request);
  }
  return accessToken;
};
