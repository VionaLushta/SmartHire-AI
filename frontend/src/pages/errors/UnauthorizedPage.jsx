import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';

export default function UnauthorizedPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center px-4 lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          Access denied
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Your current account does not have permission to view this area.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button as={Link} to="/candidate/login" variant="primary" size="lg" className="w-full">
            Sign in again
          </Button>
          <Button as={Link} to="/" variant="secondary" size="lg" className="w-full">
            Return home
          </Button>
        </div>
      </AuthCard>
    </div>
  );
}
