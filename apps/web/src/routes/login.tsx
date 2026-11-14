import type { AuthResponseDto } from "@projectx/models";
import axios from "axios";
import isInteger from "lodash/isInteger";
import { redirect } from "react-router";

import { authAPIUrl } from "@/config/app.config.server";
import { getAuthSession } from "@/cookies/auth.server";
import { csrf } from "@/cookies/session.server";
import { LoginPage } from "@/pages/LoginPage";
import { logger } from "@/services/logger.server";
import type { Route } from "./+types/login";

enum FormIntents {
  LOGIN = "login",
  VERIFY_CODE = "verify-code",
}

const AUTH_API = `${authAPIUrl}/auth`;

export const action = async ({ request }: Route.ActionArgs) => {
  const formData = await request.clone().formData();
  await csrf.validate(formData, request.headers);
  const email = formData.get("email");
  const intent = formData.get("intent");
  if (intent === FormIntents.LOGIN) {
    try {
      await axios.post(`${AUTH_API}/login`, {
        email,
      });
      return { ok: true, intent };
    } catch (error) {
      logger.error(error);
      return { error: "Failed to send login email", ok: false };
    }
  } else if (intent === FormIntents.VERIFY_CODE) {
    const code = formData.get("code");
    if (!isInteger(Number(code))) {
      return { error: "Invalid code", ok: false };
    }
    try {
      const { data } = await axios.post<AuthResponseDto>(
        `${AUTH_API}/verify-code`,
        {
          email,
          code: Number(code),
        },
      );
      const { setAuthUser, setAuthAccessToken, commitSession } =
        await getAuthSession(request);
      setAuthUser(data.user);
      setAuthAccessToken(data.accessToken);
      return redirect("/marketplace", {
        status: 302,
        headers: {
          "Set-Cookie": await commitSession(),
        },
      });
    } catch (error) {
      logger.error(error);
      return { error: "Invalid code", ok: false };
    }
  }

  return { error: "Invalid intent", ok: false };
};

export default function Index() {
  return <LoginPage />;
}
