import { Link } from 'react-router-dom';
import { Clock3 } from 'lucide-react';
import AuthCard from '../../components/auth/AuthCard';
import Button from '../../components/ui/Button';

export default function SessionExpiredPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Clock3 className="h-8 w-8" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          Session expired
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
          Please sign in again to continue using SmartHire AI.
        </p>

        <div className="mt-8">
          <Button as={Link} to="/login" variant="primary" size="lg" className="w-full">
            Sign in
          </Button>
        </div>
      </AuthCard>
    </div>
  );
}
