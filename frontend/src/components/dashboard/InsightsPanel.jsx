import { BrainCircuit, BookOpenCheck, GraduationCap, Sparkles, Target } from 'lucide-react';
import Badge from '../ui/Badge';
import { clampPercent } from '../../utils/dashboard';

function renderChips(items = []) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.length ? (
        items.map((item) => (
          <Badge key={item.label} tone="neutral">
            {item.label}
          </Badge>
        ))
      ) : (
        <span className="text-sm text-slate-500">No data yet.</span>
      )}
    </div>
  );
}

export default function InsightsPanel({ analytics }) {
  const metrics = analytics?.metrics || {};
  const gaps = analytics?.skill_gap_analysis || {};
  const insights = analytics?.insights || [];
  const resumeQuality = clampPercent(metrics.average_resume_quality);
  const aiMatch = clampPercent(metrics.average_ai_match_score);

  const recommendedCertifications = (gaps.most_missing_skills || [])
    .slice(0, 3)
    .map((item) => ({ label: `Certification in ${item.label}` }));

  const strongSkills = (gaps.most_common_skills || []).slice(0, 4);
  const missingSkills = (gaps.most_missing_skills || []).slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <Target className="h-4 w-4" aria-hidden="true" />
            Resume Quality
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{resumeQuality}%</p>
          <p className="mt-2 text-sm text-slate-600">Structured score from the AI analytics endpoint.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-500">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            AI Match %
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{aiMatch}%</p>
          <p className="mt-2 text-sm text-slate-600">Average AI fit across the active candidate pipeline.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-slate-950">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Strong Skills
          </div>
          <div className="mt-4">{renderChips(strongSkills)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-slate-950">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            Missing Skills
          </div>
          <div className="mt-4">{renderChips(missingSkills)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-950">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Recommended Certifications
          </div>
          <div className="mt-4">{renderChips(recommendedCertifications)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-slate-950">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" />
            Career Suggestions
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {insights.length ? (
              insights.slice(0, 3).map((insight) => <li key={insight}>• {insight}</li>)
            ) : (
              <li>No analytics insights are available yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
