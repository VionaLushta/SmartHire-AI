import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import AuthCard from '../../components/auth/AuthCard';
import AuthHeader from '../../components/auth/AuthHeader';
import Button from '../../components/ui/Button';
import FormError from '../../components/auth/FormError';
import PasswordInput from '../../components/auth/PasswordInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { authService } from '../../services/authService';

function validate(values) {
  const errors = {};
  if (!values.password) errors.password = 'Password is required.';
  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  if (values.password && values.confirmPassword && values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const errors = useMemo(() => validate(values), [values]);
  const invalid = Boolean(Object.keys(errors).length) || !token;

  useEffect(() => {
    if (!token) {
      setErrorMessage('Your password reset link is missing or invalid.');
    }
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (invalid) {
      if (!token) {
        setErrorMessage('Your password reset link is missing or invalid.');
      }
      return;
    }

    setBusy(true);
    try {
      await authService.resetPassword({
        token,
        password: values.password,
        confirm_password: values.confirmPassword,
      });
      setSuccessMessage('Your password has been updated. You can sign in with the new password now.');
      window.setTimeout(() => navigate('/candidate/login', { replace: true }), 1500);
    } catch (requestError) {
      setErrorMessage(requestError?.response?.data?.detail || requestError.message || 'Unable to reset the password.');
    } finally {
      setBusy(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-2xl items-center justify-center lg:min-h-[calc(100vh-4rem)]">
      <AuthCard className="w-full p-6 sm:p-8">
        <div className="space-y-8">
          <AuthHeader
            title="Set a new password"
            description="Choose a strong password to complete the reset flow."
          />

          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordInput
              label="New Password"
              name="password"
              value={values.password}
              onChange={handleChange}
              placeholder="Create a new password"
              error={(submitted || values.password) && errors.password}
              autoComplete="new-password"
            />
            <PasswordStrength password={values.password} />
            <PasswordInput
              label="Confirm Password"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat the new password"
              error={(submitted || values.confirmPassword) && errors.confirmPassword}
              autoComplete="new-password"
            />

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <FormError>{errorMessage}</FormError>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="primary" size="lg" className="flex-1" loading={busy}>
                Reset Password
              </Button>
              <Button as={Link} to="/candidate/login" variant="secondary" size="lg" className="flex-1">
                Back to Login
              </Button>
            </div>
          </form>
        </div>
      </AuthCard>
    </div>
  );
}
