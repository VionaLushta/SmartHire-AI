import { ArrowRight, Sparkles, BriefcaseBusiness, GraduationCap } from 'lucide-react';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { clampPercent, getInitials } from '../../utils/dashboard';

export default function CandidateCard({ candidate }) {
  const initials = getInitials({
    first_name: candidate.first_name,
    last_name: candidate.last_name,
    email: candidate.candidate_name,
  });

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar initials={initials} size="lg" />
          <div>
            <Badge tone="neutral">Top candidate</Badge>
            <h3 className="mt-3 text-lg font-semibold text-slate-950">{candidate.candidate_name}</h3>
            <p className="mt-1 text-sm text-slate-600">
              {candidate.skills || 'AI-qualified candidate'}
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950 px-4 py-3 text-right text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">AI Score</p>
          <p className="mt-1 text-2xl font-semibold">{clampPercent(candidate.ai_score)}%</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{candidate.skill_match != null ? `${clampPercent(candidate.skill_match)}% skill match` : 'Skills on file'}</span>
        </div>
        <div className="flex items-center gap-2">
          <BriefcaseBusiness className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{candidate.experience_match != null ? `${clampPercent(candidate.experience_match)}% experience match` : 'Experience ready'}</span>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <GraduationCap className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{candidate.resume_score != null ? `${clampPercent(candidate.resume_score)}% resume score` : 'Resume score not available'}</span>
        </div>
      </div>

      <div className="mt-5 flex">
        <Button type="button" variant="secondary" className="w-full" disabled>
          Open Profile
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
