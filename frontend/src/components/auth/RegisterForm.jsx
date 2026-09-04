import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Github } from 'lucide-react';
import Button from '../ui/Button';
import FormError from './FormError';
import LoadingOverlay from './LoadingOverlay';
import PasswordInput from './PasswordInput';
import PasswordStrength from './PasswordStrength';
import { authService } from '../../services/authService';
import { clearAuthError, registerUser } from '../../redux/slices/authSlice';
import { classNames } from '../../utils/classNames';
import { isGithubOAuthConfigured, isGoogleOAuthConfigured, googleClientId } from '../../services/authService';
import { useNotifications } from '../../context/NotificationContext';

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
  fullName: '',
  firstName: '',
  lastName: '',
  phone: '',
  city: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'Candidate',
  acceptTerms: false,
};

function validate(values) {
  const errors = {};

  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!values.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!/^[0-9()+\-\s.]{7,30}$/.test(values.phone)) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Use at least 8 characters.';
  } else if (/\s/.test(values.password)) {
    errors.password = 'Password cannot contain spaces.';
  } else if (!/[A-Z]/.test(values.password) || !/[a-z]/.test(values.password) || !/[0-9]/.test(values.password)) {
    errors.password = 'Use uppercase, lowercase, and a number.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.city.trim()) errors.city = 'City is required.';
  if (!values.acceptTerms) errors.acceptTerms = 'You must accept the terms to continue.';

  return errors;
}

export default function RegisterForm({ returnTo = '' }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { success } = useNotifications();
  const { status, error } = useSelector((state) => state.auth);

  const [values, setValues] = useState(initialState);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const successNotificationShown = useRef(false);

  const errors = useMemo(() => validate(values), [values]);
  const formInvalid = Boolean(Object.keys(errors).length);
  const busy = status === 'loading';

  useEffect(() => {
    if (status === 'succeeded' && submitted && !successNotificationShown.current) {
      successNotificationShown.current = true;
      success(
        'Verification email sent',
        `We sent a verification link to ${values.email}. Please check your inbox and spam folder.`,
        8000,
      );
      if (returnTo) {
        window.sessionStorage.setItem('smarthire-candidate-return-to', returnTo);
      }
      const query = new URLSearchParams({ pending: '1' });
      if (returnTo) query.set('returnTo', returnTo);
      navigate(`/candidate/email-verification-success?${query.toString()}`, { replace: true });
    }
  }, [navigate, returnTo, status, submitted, success, values.email]);

  const handleChange = (event) => {
    const { name, type, checked, value } = event.target;
    if (error) {
      dispatch(clearAuthError());
    }

    if (name === 'fullName') {
      const parts = value.trim().split(/\s+/).filter(Boolean);
      const firstName = parts[0] || '';
      const lastName = parts.length > 1 ? parts.slice(1).join(' ') : firstName;

      setValues((current) => ({
        ...current,
        fullName: value,
        firstName,
        lastName,
      }));
      return;
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
    setTouched({
      fullName: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      password: true,
      confirmPassword: true,
      city: true,
      acceptTerms: true,
    });

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await dispatch(
      registerUser({
        first_name: values.firstName,
        last_name: values.lastName,
        phone: values.phone,
        city: values.city,
        email: values.email,
        password: values.password,
        role_name: 'Candidate',
        accept_terms: values.acceptTerms,
        confirm_password: values.confirmPassword,
      }),
    );
  };

  const handleOAuthSignup = (provider) => {
    try {
      const roleName = values.role || 'Candidate';
      const url =
        provider === 'google'
          ? authService.googleOAuthUrl({ roleName, source: 'register' })
          : authService.githubOAuthUrl({ roleName, source: 'register' });
      window.location.assign(url);
    } catch (oauthException) {
      setOauthError(oauthException.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-3">
      {busy ? <LoadingOverlay label="Creating account" /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['firstName', 'First Name', 'given-name'],
          ['lastName', 'Last Name', 'family-name'],
        ].map(([name, label, autoComplete]) => (
          <div key={name} className="space-y-1.5">
            <label htmlFor={name} className="text-sm font-medium text-slate-700">{label}</label>
            <input
              id={name}
              name={name}
              type="text"
              value={values[name]}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete={autoComplete}
              className="h-11 w-full rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
            />
            {(touched[name] || submitted) && errors[name] ? <p className="text-xs font-medium text-rose-600">{errors[name]}</p> : null}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Personal Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="email"
          placeholder="example@gmail.com"
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

      <div className="space-y-3">
        <PasswordInput
          label="Password"
          name="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Create a password"
          error={(touched.password || submitted || values.password) && errors.password}
          autoComplete="new-password"
        />
        <PasswordStrength password={values.password} />
      </div>

      <PasswordInput
        label="Confirm Password"
        name="confirmPassword"
        value={values.confirmPassword}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Repeat your password"
        error={(touched.confirmPassword || submitted || values.confirmPassword) && errors.confirmPassword}
        autoComplete="new-password"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {[
          ['phone', 'Phone Number', 'tel'],
          ['city', 'City', 'text'],
        ].map(([name, label, type]) => (
          <div key={name} className="space-y-1.5">
            <label htmlFor={name} className="text-sm font-medium text-slate-700">{label}</label>
            <input id={name} name={name} type={type} value={values[name]} onChange={handleChange} onBlur={handleBlur} className="h-11 w-full rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10" />
            {(touched[name] || submitted) && errors[name] ? <p className="text-xs font-medium text-rose-600">{errors[name]}</p> : null}
          </div>
        ))}
      </div>

      {!isGoogleOAuthConfigured ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Google Sign-In is temporarily unavailable.
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="inline-flex items-start gap-3 text-sm leading-6 text-slate-600">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={values.acceptTerms}
            onChange={handleChange}
            onBlur={handleBlur}
            className="mt-1 h-4 w-4 rounded border-[rgba(15,23,42,0.12)] bg-white text-[#2563eb] focus:ring-[#2563eb]"
          />
          <span>
            I accept the{' '}
            <Link to="/" className="font-medium text-slate-900 underline-offset-4 hover:underline">
              terms of service
            </Link>{' '}
            and privacy policy.
          </span>
        </label>
        {(touched.acceptTerms || submitted) && errors.acceptTerms ? (
          <p className="text-xs font-medium text-rose-600">{errors.acceptTerms}</p>
        ) : null}
      </div>

      <FormError>{error || oauthError}</FormError>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || formInvalid}>
        Register
      </Button>

      <div className="flex items-center gap-3 py-0.5">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full justify-center bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          disabled={!isGoogleOAuthConfigured}
          title={isGoogleOAuthConfigured ? `Google Client ID: ${googleClientId}` : 'Google Sign-In is not configured.'}
          onClick={() => handleOAuthSignup('google')}
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full justify-center bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
          disabled={!isGithubOAuthConfigured}
          title={isGithubOAuthConfigured ? 'Continue with GitHub' : 'GitHub Sign-In is not configured.'}
          onClick={() => handleOAuthSignup('github')}
        >
          <Github className="h-5 w-5" aria-hidden="true" />
          <span>Continue with GitHub</span>
        </Button>
      </div>

      <p className="text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/candidate/login"
          className="font-semibold text-slate-900 underline-offset-4 hover:underline"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}
