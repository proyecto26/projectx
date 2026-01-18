import isEmpty from "lodash/isEmpty";
import { getAccessTokenOrRedirect } from "../cookies/auth.server";

const DEFAULT_TIMEOUT = 4000;

export type HttpOptions = RequestInit & {
  timeout?: number;
  defaultResponse?: unknown;
  errorHandler?: (response: Response) => unknown;
};

async function httpRequest<T>(
  resource: string,
  options: HttpOptions = { timeout: DEFAULT_TIMEOUT },
): Promise<T | undefined> {
  const { timeout, ...rest } = options;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout || DEFAULT_TIMEOUT);
  try {
    const response = await fetch(resource, {
      ...rest,
      cache: "reload",
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);
    if (!response.ok) {
      if (options.errorHandler) {
        options.errorHandler(response);
        return;
      }
      throw new Error(`${response.status}`);
    }
    const message = await response.text();
    return isEmpty(message) ? null : JSON.parse(message);
  } catch (error) {
    if (Object.hasOwn(rest, "defaultResponse")) {
      return rest.defaultResponse as T;
    }
    if (controller.signal.aborted) {
      throw new Error(
        `Server has not responded in ${timeout || DEFAULT_TIMEOUT} ms`,
      );
    }
    throw error;
  }
}

async function authRequest<T>(
  request: Request,
  resource: string,
  options: HttpOptions = { timeout: DEFAULT_TIMEOUT },
) {
  const accessToken = await getAccessTokenOrRedirect(request);
  const headers = new Headers(options.headers);
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  options.headers = headers;
  return await httpRequest<T>(resource, options);
}

export { httpRequest, authRequest };
