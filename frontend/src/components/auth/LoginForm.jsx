import { useEffect, useMemo, useState } from 'react';
import { Chrome, Github, Mail } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import FormError from './FormError';
import LoadingOverlay from './LoadingOverlay';
import PasswordInput from './PasswordInput';
import RememberCheckbox from './RememberCheckbox';
import { clearAuthError, loginUser } from '../../redux/slices/authSlice';
import { getDashboardPathForRole } from '../../utils/auth';
import { classNames } from '../../utils/classNames';

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

export default function LoginForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, user } = useSelector((state) => state.auth);

  const [values, setValues] = useState(initialState);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validate(values), [values]);
  const formInvalid = Boolean(Object.keys(errors).length);
  const busy = status === 'loading';

  useEffect(() => {
    if (status === 'succeeded' && submitted) {
      const from = location.state?.from?.pathname;
      const destination =
        from && from !== '/login' && from !== '/register'
          ? from
          : getDashboardPathForRole(user?.role);

      navigate(destination, { replace: true });
    }
  }, [location.state, navigate, status, submitted, user]);

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
        rememberMe: values.rememberMe,
      }),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-6">
      {busy ? <LoadingOverlay label="Signing in" /> : null}

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
            placeholder="you@company.com"
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
            to="/forgot-password"
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

      <p className="text-sm text-slate-500">
        New here?{' '}
        <Link
          to="/register"
          className="font-semibold text-slate-900 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Or continue with
          </span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button type="button" variant="secondary" className="justify-start gap-2" disabled>
            <Chrome className="h-4 w-4" aria-hidden="true" />
            Google
          </Button>
          <Button type="button" variant="secondary" className="justify-start gap-2" disabled>
            <Github className="h-4 w-4" aria-hidden="true" />
            GitHub
          </Button>
          <Button type="button" variant="secondary" className="justify-start gap-2" disabled>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email
          </Button>
        </div>
      </div>
    </form>
  );
}
