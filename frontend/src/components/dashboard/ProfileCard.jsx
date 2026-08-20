import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { classNames } from '../../utils/classNames';
import { clampPercent, getDisplayName, getInitials } from '../../utils/dashboard';

export default function ProfileCard({ profile, completion = 0 }) {
  const displayName = getDisplayName(profile || {});
  const initials = getInitials(profile || {});
  const completionValue = clampPercent(completion);

  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Profile Summary
            </p>
            <h3 className="mt-2 text-[24px] font-bold tracking-[-0.04em] text-slate-900">{displayName}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {profile?.headline || profile?.role_name || 'Candidate profile'}
            </p>
          </div>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Completion</p>
          <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{completionValue}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email
          </div>
          <p className="mt-2 font-medium text-slate-900">{profile?.email || 'Not added yet'}</p>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Phone
          </div>
          <p className="mt-2 font-medium text-slate-900">{profile?.phone || 'Not added yet'}</p>
        </div>
        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 sm:col-span-2">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Location
          </div>
          <p className="mt-2 font-medium text-slate-900">
            {[profile?.city, profile?.country].filter(Boolean).join(', ') || 'Location not added'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button as={Link} to="/profile" variant="primary" className="w-full sm:w-auto">
          Edit Profile
        </Button>
        <div className="inline-flex items-center gap-2 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Sparkles className="h-4 w-4 text-slate-700" aria-hidden="true" />
          Profile connected to the backend
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={classNames('h-full rounded-full bg-[#2563eb] transition-all')}
          style={{ width: `${completionValue}%` }}
        />
      </div>
    </div>
  );
}
