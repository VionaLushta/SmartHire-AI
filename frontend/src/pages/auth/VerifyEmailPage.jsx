import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import Button from '../../components/ui/Button';
import FormError from '../../components/auth/FormError';
import { authService } from '../../services/authService';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const verificationRequest = useRef(null);

  useEffect(() => {
    let active = true;

    if (!token) {
      setStatus('failed');
      setErrorMessage('The verification link is missing its token.');
      return () => {
        active = false;
      };
    }

    // StrictMode runs this effect twice in development. Share one request so
    // the single-use token is consumed once while the active effect gets the result.
    if (!verificationRequest.current || verificationRequest.current.token !== token) {
      verificationRequest.current = {
        token,
        promise: authService.verifyEmail(token),
      };
    }

    verificationRequest.current.promise
      .then(() => {
        if (!active) return;
        setStatus('succeeded');
        window.setTimeout(() => navigate('/candidate/email-verification-success', { replace: true }), 1200);
      })
      .catch((requestError) => {
        if (!active) return;
        setStatus('failed');
        setErrorMessage(requestError?.response?.data?.detail || requestError.message || 'Verification failed.');
      });

    return () => {
      active = false;
    };
  }, [navigate, token]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 sm:p-8">
        <div className="space-y-8 text-center">
          <AuthHeader
            title="Verifying your email"
            description="We are checking your secure verification link now."
            eyebrow="Email Verification"
          />

          {status === 'loading' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Verifying your account...
            </div>
          ) : null}

          {status === 'succeeded' ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Your email has been verified. Redirecting you to the success page...
            </div>
          ) : null}

          <FormError>{errorMessage}</FormError>

          {status === 'failed' ? (
            <Button as={Link} to="/candidate/login" variant="primary" size="lg" className="w-full">
              Return to Login
            </Button>
          ) : null}
        </div>
      </AuthCard>
    </div>
  );
}
