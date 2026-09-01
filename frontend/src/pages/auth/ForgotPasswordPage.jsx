import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import FormError from '../../components/auth/FormError';
import Button from '../../components/ui/Button';
import { authService } from '../../services/authService';
import { classNames } from '../../utils/classNames';

function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  return '';
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const error = validateEmail(email);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setErrorMessage('');
    setMessage('');

    if (error) {
      return;
    }

    setBusy(true);
    try {
      await authService.forgotPassword({ email });
      setMessage('If the account exists, we sent password reset instructions to that email address.');
    } catch (requestError) {
      setErrorMessage(requestError?.response?.data?.detail || requestError.message || 'Unable to send reset email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 sm:p-8">
        <div className="space-y-8">
          <AuthHeader
            title="Reset your password"
            description="Enter your email address and we will send a secure password reset link if the account exists."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="example@gmail.com"
                className={classNames(
                  'h-11 w-full rounded-[1.1rem] border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[rgba(37,99,235,0.12)]',
                  submitted && error
                    ? 'border-rose-300 bg-rose-50 focus:border-rose-400 focus:ring-rose-500/10'
                    : 'hover:border-slate-300',
                )}
              />
              {submitted && error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
            </div>

            {message ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            <FormError>{errorMessage}</FormError>

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
              Send Reset Link
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </AuthCard>
    </div>
  );
}
