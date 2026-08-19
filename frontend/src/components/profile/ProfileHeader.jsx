import { CalendarDays, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import Badge from '../ui/Badge';
import ProfileAvatar from './ProfileAvatar';

export default function ProfileHeader({ profile, completion = 0 }) {
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Candidate';
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ') || 'Location not shared';

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <ProfileAvatar profile={profile} size="xl" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{name}</h1>
            <p className="mt-1 text-base text-slate-600">{profile?.headline || profile?.role_name || 'Product & operations professional'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {location}</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Available to work</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {completion}% complete</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="success">Profile ready</Badge>
          <Badge tone="neutral" className="bg-slate-100 text-slate-700">
            <Sparkles className="mr-1 h-3.5 w-3.5" /> {completion}%</Badge>
        </div>
      </div>
    </section>
  );
}
