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
            <label htmlFor={field.name} className="text-sm font-medium text-slate-700">
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
                'h-11 w-full rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10',
                (touched[field.name] || submitted) && errors[field.name]
                  ? 'border-[#ef4444]/30 bg-[#fff5f5] focus:border-[#ef4444] focus:ring-[#ef4444]/10'
                  : 'hover:border-[rgba(15,23,42,0.12)]',
              )}
            />
            {(touched[field.name] || submitted) && errors[field.name] ? (
              <p className="text-xs font-medium text-rose-600">{errors[field.name]}</p>
            ) : null}
          </div>
        ))}
      </div>

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
        <label htmlFor="role" className="text-sm font-medium text-slate-700">
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
            'h-11 w-full rounded-xl border border-[rgba(15,23,42,0.08)] bg-white px-4 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-150 ease-out focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10',
            (touched.role || submitted) && errors.role
              ? 'border-[#ef4444]/30 bg-[#fff5f5] focus:border-[#ef4444] focus:ring-[#ef4444]/10'
              : 'hover:border-[rgba(15,23,42,0.12)]',
          )}
        >
          <option value="candidate">Candidate</option>
          <option value="company">Company</option>
        </select>
        {(touched.role || submitted) && errors.role ? (
          <p className="text-xs font-medium text-rose-600">{errors.role}</p>
        ) : null}
      </div>

      <div className="space-y-3">
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

      <FormError>{error}</FormError>

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy || formInvalid}>
        Register
      </Button>

      <p className="text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-slate-900 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
