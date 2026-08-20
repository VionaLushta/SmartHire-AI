import { Link } from 'react-router-dom';
import { APP_NAME } from '../../constants/app';
import { classNames } from '../../utils/classNames';

export function BrandMark({ className = '' }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={classNames('shrink-0', className)}
      aria-hidden="true"
    >
      <rect x="11" y="11" width="26" height="8" rx="4" fill="#0f172a" />
      <rect x="17" y="20" width="20" height="8" rx="4" fill="#2563eb" />
      <rect x="11" y="29" width="26" height="8" rx="4" fill="#e2e8f0" />
      <rect x="31" y="11" width="6" height="26" rx="3" fill="#1d4ed8" />
      <rect x="38" y="11" width="4" height="4" rx="2" fill="#93c5fd" />
    </svg>
  );
}

export default function BrandLockup({
  linkTo,
  className = '',
  subtitle = 'Premium hiring software',
  compact = false,
  inverse = true,
}) {
  const Wrapper = linkTo ? Link : 'div';
  const wrapperProps = linkTo ? { to: linkTo } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={classNames('inline-flex items-center gap-3 transition duration-150 ease-out', className)}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_20px_rgba(15,23,42,0.05)]">
        <BrandMark className="h-6 w-6" />
      </span>
      {compact ? null : (
        <span className="min-w-0">
          <span
            className={classNames(
              'block text-[0.65rem] font-semibold uppercase tracking-[0.28em]',
              inverse ? 'text-slate-500' : 'text-slate-500',
            )}
          >
            {APP_NAME}
          </span>
          <span
            className={classNames(
              'block text-sm font-semibold tracking-[-0.02em]',
              inverse ? 'text-slate-900' : 'text-slate-900',
            )}
          >
            {subtitle}
          </span>
        </span>
      )}
    </Wrapper>
  );
}
