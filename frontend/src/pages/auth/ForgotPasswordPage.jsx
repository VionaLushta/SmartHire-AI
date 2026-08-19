import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import Button from '../../components/ui/Button';
import { classNames } from '../../utils/classNames';

function validateEmail(email) {
  if (!email.trim()) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  return '';
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const error = validateEmail(email);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);

    if (error) {
      return;
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 sm:p-8">
        <div className="space-y-8">
          <AuthHeader
            title="Reset your password"
            description="Enter your email address and we will prepare password reset instructions for the next step."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="forgot-email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className={classNames(
                  'h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-950 dark:text-slate-50',
                  submitted && error
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-900'
                    : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-800 dark:focus:border-slate-600',
                )}
              />
              {submitted && error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}
            </div>

            {submitted && !error ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                UI only: reset instructions would be sent from the backend in a later ticket.
              </div>
            ) : null}

            <Button type="submit" variant="primary" size="lg" className="w-full">
              Send Reset Link
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </AuthCard>
    </div>
  );
}
