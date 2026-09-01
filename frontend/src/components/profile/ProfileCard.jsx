import { BriefcaseBusiness, Building2, Compass, Download, Github, Globe, Languages, Linkedin, Mail, MapPin, Phone, Sparkles } from 'lucide-react';
import { getDisplayName } from '../../utils/dashboard';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function ProfileCard({ profile, completion = 0, onEdit }) {
  const name = getDisplayName(profile || {});
  const location = [profile?.city, profile?.country].filter(Boolean).join(', ') || 'Location not added';
  const languages = Array.isArray(profile?.languages) ? profile.languages : ['English'];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate profile</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{name}</h2>
          <p className="mt-2 text-base text-slate-600">{profile?.headline || 'Product-minded professional ready for meaningful growth.'}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="success">{completion}% complete</Badge>
          <Button variant="secondary" size="md" onClick={onEdit}>Edit profile</Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Mail className="h-4 w-4" /> Email</div>
          <p className="mt-2 font-medium text-slate-950">{profile?.email || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Phone className="h-4 w-4" /> Phone</div>
          <p className="mt-2 font-medium text-slate-950">{profile?.phone || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
          <div className="flex items-center gap-2 text-slate-500"><MapPin className="h-4 w-4" /> Location</div>
          <p className="mt-2 font-medium text-slate-950">{location}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Globe className="h-4 w-4" /> Website</div>
          <p className="mt-2 font-medium text-slate-950">{profile?.portfolio_url || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Compass className="h-4 w-4" /> Availability</div>
          <p className="mt-2 font-medium text-slate-950">{profile?.availability || 'Open to opportunities'}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-slate-500" /><span className="text-sm font-medium text-slate-700">Professional bio</span></div>
        <p className="text-sm leading-6 text-slate-600">{profile?.about_me || 'No bio added yet.'}</p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Linkedin className="h-4 w-4" /> LinkedIn</div>
          <p className="mt-2 font-medium text-slate-950">{profile?.linkedin_url || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Github className="h-4 w-4" /> GitHub</div>
          <p className="mt-2 font-medium text-slate-950">{profile?.github_url || 'Not added yet'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
          <div className="flex items-center gap-2 text-slate-500"><Languages className="h-4 w-4" /> Languages</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {languages.map((language) => (
              <Badge key={language} tone="neutral">{language}</Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
