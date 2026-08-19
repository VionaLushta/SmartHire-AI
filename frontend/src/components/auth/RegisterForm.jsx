import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';
import FormError from './FormError';
import LoadingOverlay from './LoadingOverlay';
import PasswordInput from './PasswordInput';
import PasswordStrength from './PasswordStrength';
import { clearAuthError, registerUser } from '../../redux/slices/authSlice';
import { classNames } from '../../utils/classNames';

const initialState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'candidate',
  acceptTerms: false,
};

function validate(values) {
  const errors = {};

  if (!values.firstName.trim()) errors.firstName = 'First name is required.';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required.';

  if (!values.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Use at least 8 characters.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.role) errors.role = 'Select a role.';
  if (!values.acceptTerms) errors.acceptTerms = 'You must accept the terms to continue.';

  return errors;
}

export default function RegisterForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error } = useSelector((state) => state.auth);

  const [values, setValues] = useState(initialState);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => validate(values), [values]);
  const formInvalid = Boolean(Object.keys(errors).length);
  const busy = status === 'loading';

  useEffect(() => {
    if (status === 'succeeded' && submitted) {
      navigate('/email-verification-success', { replace: true });
    }
  }, [navigate, status, submitted]);

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
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
      role: true,
      acceptTerms: true,
    });

    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    await dispatch(
      registerUser({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        role: values.role,
        acceptTerms: values.acceptTerms,
      }),
    );
  };

  return (
    <form onSubmit={handleSubmit} className="relative space-y-5">
      {busy ? <LoadingOverlay label="Creating account" /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { name: 'firstName', label: 'First Name', placeholder: 'Ava', autoComplete: 'given-name' },
          { name: 'lastName', label: 'Last Name', placeholder: 'Johnson', autoComplete: 'family-name' },
        ].map((field) => (
          <div key={field.name} className="space-y-2">
            <label htmlFor={field.name} className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {field.label}
            </label>
            <input
              id={field.name}
              name={field.name}
              type="text"
              value={values[field.name]}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              aria-invalid={Boolean((touched[field.name] || submitted) && errors[field.name])}
              className={classNames(
                'h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-950 dark:text-slate-50',
                (touched[field.name] || submitted) && errors[field.name]
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-900'
                  : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-800 dark:focus:border-slate-600',
              )}
            />
            {(touched[field.name] || submitted) && errors[field.name] ? (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors[field.name]}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-200">
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
            'h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:ring-2 dark:bg-slate-950 dark:text-slate-50',
            (touched.email || submitted) && errors.email
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-900'
              : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-800 dark:focus:border-slate-600',
          )}
        />
        {(touched.email || submitted) && errors.email ? (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.email}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <PasswordInput
          label="Password"
          name="password"
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Create a password"
          error={(touched.password || submitted) && errors.password}
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
        error={(touched.confirmPassword || submitted) && errors.confirmPassword}
        autoComplete="new-password"
      />

      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Role
        </label>
        <select
          id="role"
          name="role"
          value={values.role}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={Boolean((touched.role || submitted) && errors.role)}
          className={classNames(
            'h-11 w-full rounded-xl border bg-white px-4 text-sm text-slate-950 outline-none transition focus:ring-2 dark:bg-slate-950 dark:text-slate-50',
            (touched.role || submitted) && errors.role
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/10 dark:border-rose-900'
              : 'border-slate-200 focus:border-slate-400 focus:ring-slate-900/10 dark:border-slate-800 dark:focus:border-slate-600',
          )}
        >
          <option value="candidate">Candidate</option>
          <option value="company">Company</option>
        </select>
        {(touched.role || submitted) && errors.role ? (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.role}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <label className="inline-flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={values.acceptTerms}
            onChange={handleChange}
            onBlur={handleBlur}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-900"
          />
          <span>
            I accept the{' '}
            <Link to="/" className="font-medium text-slate-950 underline-offset-4 hover:underline dark:text-slate-50">
              terms of service
            </Link>{' '}
            and privacy policy.
          </span>
        </label>
        {(touched.acceptTerms || submitted) && errors.acceptTerms ? (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.acceptTerms}</p>
        ) : null}
      </div>

      <FormError>{error}</FormError>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || formInvalid}>
        Register
      </Button>

      <p className="text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-slate-950 underline-offset-4 hover:underline dark:text-slate-50"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
