import { classNames } from '../../utils/classNames';

export default function ProfileAvatar({ profile, size = 'lg', className }) {
  const sizes = {
    sm: 'h-12 w-12 text-sm',
    md: 'h-16 w-16 text-base',
    lg: 'h-20 w-20 text-xl',
    xl: 'h-28 w-28 text-2xl',
  };

  const initials = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SH';

  if (profile?.profile_picture_url) {
    return (
      <img
        src={profile.profile_picture_url}
        alt={`${profile.first_name ?? 'Candidate'} ${profile.last_name ?? ''}`.trim() || 'Candidate profile'}
        className={classNames('rounded-full object-cover ring-4 ring-white shadow-sm', sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={classNames(
        'inline-flex items-center justify-center rounded-full bg-slate-950 font-semibold text-white ring-4 ring-white shadow-sm',
        sizes[size],
        className,
      )}
      aria-label="Profile avatar"
    >
      {initials}
    </div>
  );
}
