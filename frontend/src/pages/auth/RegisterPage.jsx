import { Link, useLocation } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import RegisterForm from '../../components/auth/RegisterForm';

export default function RegisterPage() {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '';
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col justify-center px-4 py-4 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:px-8">
      <div className="mb-2">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          ← Back to Home
        </Link>
      </div>

      <AuthCard className="w-full p-4 sm:p-5 lg:p-6">
        <div className="space-y-4">
          <AuthHeader
            title="Create your account"
            description="Create your candidate account and start discovering opportunities."
          />
          <RegisterForm returnTo={returnTo} />
        </div>
      </AuthCard>
    </div>
  );
}
