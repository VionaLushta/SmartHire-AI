import { ArrowRight, BriefcaseBusiness, MapPin, Wallet } from 'lucide-react';
import Badge from '../ui/Badge';

export default function CareerGoalsCard({ goals = {} }) {
  const industries = Array.isArray(goals.industries) ? goals.industries : ['Product', 'Technology'];
  const interests = Array.isArray(goals.career_interests) ? goals.career_interests : ['Career growth'];

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Career goals</p>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">Target direction</h3>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><BriefcaseBusiness className="h-4 w-4" /> Preferred role</div>
          <p className="mt-2 font-medium text-slate-950">{goals.preferred_role || 'Not specified'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><Wallet className="h-4 w-4" /> Preferred salary</div>
          <p className="mt-2 font-medium text-slate-950">{goals.preferred_salary || 'Not specified'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><MapPin className="h-4 w-4" /> Preferred location</div>
          <p className="mt-2 font-medium text-slate-950">{goals.preferred_location || 'Not specified'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-slate-500"><ArrowRight className="h-4 w-4" /> Remote preference</div>
          <p className="mt-2 font-medium text-slate-950">{goals.remote_preference || 'Not specified'}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-700">Industries</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {industries.map((item) => <Badge key={item} tone="neutral">{item}</Badge>)}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-slate-700">Career interests</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {interests.map((item) => <Badge key={item} tone="success">{item}</Badge>)}
        </div>
      </div>
    </section>
  );
}
