import { BookOpenCheck, ChartNoAxesCombined, GraduationCap, Sparkles, Target } from 'lucide-react';
import Badge from '../ui/Badge';
import { clampPercent } from '../../utils/dashboard';

function ChipRow({ items = [], emptyLabel = 'No data yet.' }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={item.label} tone="neutral">
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

function InsightPanel({ icon: Icon, label, value, description, tone = 'slate' }) {
  const toneClasses = {
    slate: 'text-slate-900',
    blue: 'text-[#2563eb]',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };

  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(15,23,42,0.08)] bg-slate-50 text-slate-700">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
          <p className={`mt-3 text-[30px] font-bold tracking-[-0.04em] ${toneClasses[tone] || toneClasses.slate}`}>
            {value}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function InsightsPanel({ analytics }) {
  const metrics = analytics?.metrics || {};
  const gaps = analytics?.skill_gap_analysis || {};
  const insights = analytics?.insights || [];
  const resumeQuality = clampPercent(metrics.average_resume_quality);
  const aiMatch = clampPercent(metrics.average_ai_match_score);

  const strongSkills = (gaps.most_common_skills || []).slice(0, 4);
  const missingSkills = (gaps.most_missing_skills || []).slice(0, 4);
  const recommendedCertifications = missingSkills.slice(0, 3).map((item) => ({
    label: `Certification in ${item.label}`,
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <InsightPanel
          icon={Target}
          label="Resume quality"
          value={`${resumeQuality}%`}
          description="Structured score from the AI analytics payload."
          tone="blue"
        />
        <InsightPanel
          icon={ChartNoAxesCombined}
          label="AI match"
          value={`${aiMatch}%`}
          description="Average fit across the active candidate pipeline."
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Strong skills
          </div>
          <div className="mt-4">
            <ChipRow items={strongSkills} emptyLabel="No strong skills available yet." />
          </div>
        </div>

        <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            Missing skills
          </div>
          <div className="mt-4">
            <ChipRow items={missingSkills} emptyLabel="No missing skills detected yet." />
          </div>
        </div>

        <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Recommended certifications
          </div>
          <div className="mt-4">
            <ChipRow
              items={recommendedCertifications}
              emptyLabel="No certification recommendations yet."
            />
          </div>
        </div>

        <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            <ChartNoAxesCombined className="h-4 w-4" aria-hidden="true" />
            Career suggestions
          </div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {insights.length ? (
              insights.slice(0, 3).map((insight) => (
                <li key={insight} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#2563eb]" aria-hidden="true" />
                  <span>{insight}</span>
                </li>
              ))
            ) : (
              <li>No analytics insights are available yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
