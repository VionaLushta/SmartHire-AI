import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import BrandLockup from '../../components/brand/BrandLockup';
import LoginForm from '../../components/auth/LoginForm';
import Button from '../../components/ui/Button';

export default function LoginPage({ authMode = 'candidate' }) {
  const isAdmin = authMode === 'admin';
  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[500px] flex-col justify-center px-4 py-6 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:px-8">
      <Button
        as={Link}
        to="/"
        variant="secondary"
        size="sm"
        className="mb-4 w-fit border-slate-200 bg-white/70 px-3.5 text-slate-600 shadow-none hover:border-slate-300 hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Home
      </Button>

      <AuthCard className="w-full p-6 sm:p-7">
        <div className="space-y-6">
          <BrandLockup linkTo="/" subtitle="Premium hiring software" className="px-0 py-0" />

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-[2rem]">
              Log in to SmartHire AI
            </h1>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              {isAdmin
                ? 'Sign in to access the SmartHire AI administration workspace.'
                : 'Sign in to manage your candidate profile, applications, and career opportunities.'}
            </p>
          </div>

          <LoginForm authMode={authMode} />
          <div className="text-center text-sm text-slate-500">
            {isAdmin ? 'Signing in as a candidate?' : 'Signing in as an administrator?'}{' '}
            <Link
              to={isAdmin ? '/candidate/login' : '/admin/login'}
              className="font-semibold text-[#1d4ed8] underline-offset-4 hover:underline"
            >
              {isAdmin ? 'Go to Candidate Login' : 'Go to Admin Login'}
            </Link>
          </div>
          {!isAdmin ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
            <p className="text-sm text-slate-600">Don't have an account?</p>
            <Link
              to="/candidate/register"
              className="mt-1 inline-flex text-sm font-semibold text-[#1d4ed8] underline-offset-4 hover:underline"
            >
              Create your Candidate Account
            </Link>
          </div> : null}
        </div>
      </AuthCard>
    </div>
  );
}
