import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { classnames } from '@projectx/ui';
import { useFetcher } from 'react-router';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import OtpInput from 'react-otp-input';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

type LoginState = 'email' | 'code';

type FormData = {
  email: string;
  code: string;
};

const INPUT_CLASS_NAMES = `
  rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500
`

enum FormIntents {
  LOGIN = 'login',
  VERIFY_CODE = 'verify-code',
}

type SubmitResponse = {
  ok: boolean;
  intent: FormIntents;
  error?: string;
}

export function LoginPage() {
  const csrf = useAuthenticityToken();
  const fetcher = useFetcher<SubmitResponse>();
  const [loginState, setLoginState] = useState<LoginState>('email');
  const [formData, setFormData] = useState<FormData>({ email: '', code: '' });
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
      { method: 'post', action: '/login' },
    );
  };

  useEffect(() => {
    if (fetcher?.data?.ok) {
      setLoading(false);
      if (fetcher.data.intent === FormIntents.LOGIN) {
        setLoginState('code');
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
      { method: 'post', action: '/login' },
    );
  }


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
    const code = e.clipboardData.getData('text');
    if (code.length === 6) {
      handleCodeChange(code);
    }
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-lg p-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Log in</h2>
        {loginState === 'email' ? (
          <fetcher.Form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className={classnames("w-full px-4 py-2", INPUT_CLASS_NAMES)} placeholder="Enter your email" required />
                <EnvelopeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>
            <button type="submit" className={`w-full px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </fetcher.Form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Check your email for a code
              </label>
              <div className="py-4 flex items-center justify-center w-full">
                <OtpInput
                  containerStyle="flex gap-4 justify-between w-full max-w-xs"
                  onChange={handleCodeChange}
                  value={formData.code}
                  inputType="number"
                  numInputs={6}
                  onPaste={onPaste}
                  renderInput={(props) => (
                    <input {...props}
                      className={classnames(props.className, "flex-1 p-0 h-14 text-2xl", INPUT_CLASS_NAMES)}
                    />
                  )}
                />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                We've sent a 6-character code to {formData.email}. The code expires shortly, so please enter it soon.
              </p>
            </div>
            <button type="submit" className={`w-full px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button type="button" className="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2" onClick={() => setLoginState('email')}>
              Back to Email
            </button>
          </form>
        )}
        {fetcher.data?.error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-sm text-red-600 dark:text-red-400">
            {fetcher.data.error}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
