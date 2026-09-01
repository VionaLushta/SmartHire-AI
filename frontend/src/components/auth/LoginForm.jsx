import { useEffect, useMemo, useState } from 'react';
import { Github, Mail } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Button from '../ui/Button';
import FormError from './FormError';
import LoadingOverlay from './LoadingOverlay';
import PasswordInput from './PasswordInput';
import RememberCheckbox from './RememberCheckbox';
import { clearAuthError, loginUser } from '../../redux/slices/authSlice';
import { getDashboardPathForRole, getSafeInternalPath } from '../../utils/auth';
import { classNames } from '../../utils/classNames';
import { isGoogleOAuthConfigured, googleClientId } from '../../services/authService';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.95h5.43c-.24 1.33-.99 2.46-2.12 3.22v2.68h3.44c2.01-1.85 3.16-4.57 3.16-7.81 0-.76-.07-1.49-.2-2.04H12z"
      />
      <path
        fill="#34A853"
        d="M12 24c2.87 0 5.28-.95 7.04-2.58l-3.44-2.68c-.96.65-2.19 1.03-3.6 1.03-2.76 0-5.1-1.86-5.93-4.38H2.49v2.75A11.98 11.98 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M6.07 15.39A7.2 7.2 0 0 1 5.67 12c0-1.18.21-2.32.6-3.39V5.86H2.49A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.79-1.99z"
      />
      <path
        fill="#4285F4"
        d="M12 4.77c1.56 0 2.96.54 4.06 1.6l3.04-3.04C17.26 1.75 14.86.75 12 .75 7.84.75 4.22 3.14 2.49 5.86l4.18 3.25C7.9 6.64 9.85 4.77 12 4.77z"
      />
    </svg>
  );
}

const initialState = {
  email: '',
  password: '',
  rememberMe: true,
};

function validate(values) {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  }

  return errors;
}

export default function LoginForm({ authMode = 'candidate' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, user } = useSelector((state) => state.auth);

  const [values, setValues] = useState(initialState);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const returnTo = useMemo(() => {
    const searchParams = new URLSearchParams(location.search || '');
    const fromQuery = searchParams.get('returnTo');
    const fromState =
      location.state?.from?.pathname
      ? `${location.state.from.pathname}${location.state.from.search || ''}${location.state.from.hash || ''}`
      : '';
    return getSafeInternalPath(fromQuery || fromState, '');
  }, [location.hash, location.search, location.state]);

  const errors = useMemo(() => validate(values), [values]);
  const formInvalid = Boolean(Object.keys(errors).length);
  const busy = status === 'loading';

  useEffect(() => {
    if (status === 'succeeded' && submitted) {
      const destination = returnTo || getDashboardPathForRole(user?.role);

      navigate(destination, { replace: true });
    }
  }, [navigate, returnTo, status, submitted, user]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    if (error) {
      dispatch(clearAuthError());
    }
    setValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBlur = (event) => {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitted(true);
    setTouched({ email: true, password: true });

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await dispatch(
      loginUser({
        email: values.email,
        password: values.password,
        remember_me: values.rememberMe,
        authMode,
      }),
    );
  };

  const handleOAuthLogin = (provider) => {
    const roleName = 'Candidate';
    const url =
      provider === 'google'
        ? authService.googleOAuthUrl({ roleName, source: 'login' })
        : authService.githubOAuthUrl({ roleName, source: 'login' });
    window.location.assign(url);
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5">
      {busy ? <LoadingOverlay label="Signing in" /> : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            {authMode === 'admin' ? 'Email' : 'Personal Email'}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
            placeholder={authMode === 'admin' ? 'you@company.com' : 'example@gmail.com'}
            aria-invalid={Boolean((touched.email || submitted) && errors.email)}
            className={classNames(
              'h-11 w-full rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10',
              (touched.email || submitted) && errors.email
                ? 'border-[#ef4444]/30 bg-[#fff5f5] focus:border-[#ef4444] focus:ring-[#ef4444]/10'
                : 'hover:border-[rgba(15,23,42,0.12)]',
            )}
          />
          {(touched.email || submitted) && errors.email ? (
            <p className="text-xs font-medium text-rose-600">{errors.email}</p>
          ) : null}
        </div>

        <PasswordInput
          label="Password"
          name="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Enter your password"
          error={(touched.password || submitted) && errors.password}
          autoComplete="current-password"
          />

        <div className="flex items-center justify-between gap-4">
          <RememberCheckbox
            checked={values.rememberMe}
            onChange={handleChange}
            name="rememberMe"
          />
          <Link
            to="/candidate/forgot-password"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-2 focus:ring-offset-white"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <FormError>{error}</FormError>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || formInvalid}>
        Login
      </Button>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Or continue with
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            disabled={!isGoogleOAuthConfigured}
            title={isGoogleOAuthConfigured ? `Google Client ID: ${googleClientId}` : 'Google Sign-In is not configured.'}
            onClick={() => handleOAuthLogin('google')}
          >
            <GoogleIcon />
            <span>Continue with Google</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full justify-center bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            onClick={() => handleOAuthLogin('github')}
          >
            <Github className="h-5 w-5" aria-hidden="true" />
            <span>Continue with GitHub</span>
          </Button>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          as={Link}
            to="/candidate/forgot-password"
          className="w-full justify-center border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:bg-slate-50"
        >
          <Mail className="h-5 w-5" aria-hidden="true" />
          <span>Reset Password</span>
        </Button>
      </div>
    </form>
  );
}
