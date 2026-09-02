import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';

export default function EmailVerificationSuccessPage() {
  const [searchParams] = useSearchParams();
  const verificationPending = searchParams.get('pending') === '1';
  const returnTo = searchParams.get('returnTo') || (typeof window !== 'undefined' ? window.sessionStorage.getItem('smarthire-candidate-return-to') : '') || '';
  const loginPath = `/candidate/login${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`;
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          {verificationPending ? 'Check your email' : 'Email verified successfully'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          {verificationPending
            ? 'We sent a verification link to your email address. Open it before signing in to SmartHire AI.'
            : 'Your account is ready. You can return to the login screen and continue into SmartHire AI.'}
        </p>

        <div className="mt-8">
          <Button as={Link} to={loginPath} variant="primary" size="lg" className="w-full">
            Go to Login
          </Button>
        </div>
      </AuthCard>
    </div>
  );
}
