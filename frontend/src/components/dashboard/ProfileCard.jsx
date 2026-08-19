import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import { classNames } from '../../utils/classNames';
import { clampPercent, getDisplayName, getInitials } from '../../utils/dashboard';

export default function ProfileCard({ profile, completion = 0 }) {
  const displayName = getDisplayName(profile || {});
  const initials = getInitials(profile || {});

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} size="lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Profile Summary
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{displayName}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {profile?.headline || profile?.role_name || 'Candidate profile'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Completion</p>
          <p className="mt-1 text-2xl font-semibold">{clampPercent(completion)}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email
          </div>
          <p className="mt-2 font-medium text-slate-950">{profile?.email || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Phone className="h-4 w-4" aria-hidden="true" />
            Phone
          </div>
          <p className="mt-2 font-medium text-slate-950">{profile?.phone || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            Location
          </div>
          <p className="mt-2 font-medium text-slate-950">
            {[profile?.city, profile?.country].filter(Boolean).join(', ') || 'Location not added'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button as={Link} to="/profile" variant="primary" className="w-full sm:w-auto">
          Edit Profile
        </Button>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <Sparkles className="h-4 w-4 text-slate-950" aria-hidden="true" />
          Profile connected to the backend
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={classNames('h-full rounded-full bg-slate-950 transition-all')}
          style={{ width: `${clampPercent(completion)}%` }}
        />
      </div>
    </div>
  );
}
