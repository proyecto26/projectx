import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { classnames } from "@projectx/ui";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import OtpInput from "react-otp-input";
import { useFetcher } from "react-router";
import { useAuthenticityToken } from "remix-utils/csrf/react";

type LoginState = "email" | "code";

type FormData = {
  email: string;
  code: string;
};

const INPUT_CLASS_NAMES = `
  rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500
`;

enum FormIntents {
  LOGIN = "login",
  VERIFY_CODE = "verify-code",
}

type SubmitResponse = {
  ok: boolean;
  intent: FormIntents;
  error?: string;
};

export function LoginPage() {
  const csrf = useAuthenticityToken();
  const fetcher = useFetcher<SubmitResponse>();
  const [loginState, setLoginState] = useState<LoginState>("email");
  const [formData, setFormData] = useState<FormData>({ email: "", code: "" });
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    fetcher.submit(
      {
        csrf,
        email: formData.email,
        intent: FormIntents.LOGIN,
      },
      { method: "post", action: "/login" },
    );
  };

  useEffect(() => {
    if (fetcher?.data?.ok) {
      setLoading(false);
      if (fetcher.data.intent === FormIntents.LOGIN) {
        setLoginState("code");
      }
    } else if (fetcher?.data?.error) {
      setLoading(false);
    }
  }, [fetcher.data]);

  const onVerifyCode = async (code = formData.code) => {
    setLoading(true);
    fetcher.submit(
      {
        csrf,
        email: formData.email,
        code,
        intent: FormIntents.VERIFY_CODE,
      },
      { method: "post", action: "/login" },
    );
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onVerifyCode();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCodeChange = (code: string) => {
    setFormData((prev) => ({ ...prev, code }));
    if (code.length === 6) {
      onVerifyCode(code);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLElement>) => {
    e.preventDefault();
    const code = e.clipboardData.getData("text");
    if (code.length === 6) {
      handleCodeChange(code);
    }
  };

  return (
    <div className="flex flex-grow items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800"
      >
        <h2 className="mb-6 font-bold text-3xl text-gray-900 dark:text-white">
          Log in
        </h2>
        {loginState === "email" ? (
          <fetcher.Form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300"
              >
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={classnames("w-full px-4 py-2", INPUT_CLASS_NAMES)}
                  placeholder="Enter your email"
                  required
                />
                <EnvelopeIcon className="absolute top-1/2 right-3 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
              </div>
            </div>
            <button
              type="submit"
              className={`w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Login Code"}
            </button>
          </fetcher.Form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="mb-1 block font-medium text-gray-700 text-sm dark:text-gray-300"
              >
                Check your email for a code
              </label>
              <div className="flex w-full items-center justify-center py-4">
                <OtpInput
                  containerStyle="flex gap-4 justify-between w-full max-w-xs"
                  onChange={handleCodeChange}
                  value={formData.code}
                  inputType="number"
                  numInputs={6}
                  onPaste={onPaste}
                  renderInput={(props) => (
                    <input
                      {...props}
                      className={classnames(
                        props.className,
                        "h-14 flex-1 p-0 text-2xl",
                        INPUT_CLASS_NAMES,
                      )}
                    />
                  )}
                />
              </div>
              <p className="mb-2 text-gray-500 text-sm dark:text-gray-400">
                We've sent a 6-character code to {formData.email}. The code
                expires shortly, so please enter it soon.
              </p>
            </div>
            <button
              type="submit"
              className={`w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
            <button
              type="button"
              className="w-full rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              onClick={() => setLoginState("email")}
            >
              Back to Email
            </button>
          </form>
        )}
        {fetcher.data?.error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-red-600 text-sm dark:text-red-400"
          >
            {fetcher.data.error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
