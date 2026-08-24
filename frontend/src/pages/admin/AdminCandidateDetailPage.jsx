import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, FileText, GraduationCap, Sparkles, UserRound } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/admin/StatusBadge';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse, getInitials, formatDateShort, formatMetricPercent } from '../../utils/dashboard';
import { asArray, buildCandidateRows } from './adminData';

function ChipList({ items = [], emptyLabel = 'No data returned.' }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Badge key={typeof item === 'string' ? item : item.label || item} tone="neutral">
          {typeof item === 'string' ? item : item.label || item.name || item}
        </Badge>
      ))}
    </div>
  );
}

export default function AdminCandidateDetailPage() {
  const { candidateId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadCandidate() {
      try {
        const response = await analyticsService.candidate(candidateId);
        const data = unwrapResponse(response) || {};
        if (mounted) setAnalytics(data);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Unable to load candidate details.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (candidateId) {
      loadCandidate();
    }

    return () => {
      mounted = false;
    };
  }, [candidateId]);

  const candidateData = analytics?.candidate || analytics?.profile || analytics?.user || analytics || null;
  const candidate = candidateData || {};
  const candidateRows = useMemo(() => buildCandidateRows({ top_candidates: [candidateData || {}] }), [candidateData]);
  const detail = candidateRows[0] || {};
  const certificates = asArray(analytics?.certificates || candidate.certificates);
  const detectedSkills = asArray(analytics?.detected_skills || candidate.detected_skills || candidate.skills);
  const missingSkills = asArray(analytics?.missing_skills || candidate.missing_skills);
  const strengths = asArray(analytics?.strengths || candidate.strengths);
  const weaknesses = asArray(analytics?.weaknesses || candidate.weaknesses);
  const notes = analytics?.recruiter_notes || candidate.recruiter_notes || candidate.notes || '';
  const recommendation =
    analytics?.ai_recommendation ||
    candidate.ai_recommendation ||
    candidate.recommendation ||
    candidate.summary ||
    analytics?.insights?.[0] ||
    'No recommendation returned for this candidate.';
  const interviewStatus = analytics?.interview_status || candidate.interview_status || detail.interview_status || 'Not scheduled';
  const resumePreview =
    analytics?.resume_preview ||
    candidate.resume_preview ||
    candidate.resume_text ||
    candidate.parsed_text ||
    analytics?.resume?.parsed_text ||
    '';
  const profileName =
    candidate.candidate_name ||
    [candidate.first_name, candidate.last_name].filter(Boolean).join(' ').trim() ||
    'Candidate detail';

  const summaryItems = [
    { label: 'Primary Match', value: formatMetricPercent(detail.primary_match ?? analytics?.primary_match ?? candidate.ai_score ?? candidate.overall_score) },
    { label: 'Applied Position', value: detail.applied_position || candidate.applied_position || candidate.job_title || 'Open role' },
    { label: 'Interview Status', value: interviewStatus },
    { label: 'Applied Date', value: formatDateShort(detail.applied_date || candidate.applied_date || candidate.created_at) },
  ];

  if (loading) {
    return <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading candidate details...</div>;
  }

  if (error && !analytics) {
    return (
      <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between gap-3">
        <Button as={Link} to="/admin/candidates" variant="secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to candidates
        </Button>
        <StatusBadge status={interviewStatus} />
      </div>

      <section className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-4">
            <Avatar initials={getInitials({ first_name: profileName })} size="lg" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate detail</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{profileName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Review the candidate record, the parsed resume content, and the recruiter-facing fit signals in one place.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          <AdminCard
            title="Resume preview"
            description="The resume preview and parsed text are surfaced here when the analytics endpoint provides them."
          >
            {resumePreview ? (
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {resumePreview}
              </pre>
            ) : (
              <EmptyState title="No resume preview returned" description="The candidate analytics payload did not include parsed resume content." />
            )}
          </AdminCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminCard title="Certificates" description="Credentials surfaced by the candidate analytics payload.">
              <div className="space-y-3">
                {certificates.length ? (
                  certificates.map((cert, index) => (
                    <div key={`${cert.title || cert.name || index}`} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold tracking-[-0.02em] text-slate-950">{cert.title || cert.name || `Certificate ${index + 1}`}</p>
                          <p className="mt-1 text-sm text-slate-600">{cert.issuer || cert.organization || 'Issuer not provided'}</p>
                        </div>
                        <Badge tone="neutral">{cert.status || 'On file'}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No certificates returned" description="Certificates will appear here when the backend includes them." />
                )}
              </div>
            </AdminCard>

            <AdminCard title="Interview status" description="Interview progress and scheduling state.">
              <div className="space-y-3">
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Status</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{interviewStatus}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recommendation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{recommendation}</p>
                </div>
              </div>
            </AdminCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminCard title="Detected skills" description="Skills extracted from the candidate profile.">
              <ChipList items={detectedSkills} emptyLabel="No detected skills returned." />
            </AdminCard>

            <AdminCard title="Missing skills" description="Known gaps from the analytics model.">
              <ChipList items={missingSkills} emptyLabel="No missing skills returned." />
            </AdminCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminCard title="Strengths" description="Highlights that help the recruiter scan quickly.">
              {strengths.length ? (
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  {strengths.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No strengths returned" description="Strengths will appear when the analytics endpoint includes them." />
              )}
            </AdminCard>

            <AdminCard title="Weaknesses" description="Risks or gaps for recruiter review.">
              {weaknesses.length ? (
                <ul className="space-y-3 text-sm leading-6 text-slate-600">
                  {weaknesses.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No weaknesses returned" description="Weakness signals will appear when the analytics endpoint includes them." />
              )}
            </AdminCard>
          </div>
        </div>

        <aside className="space-y-6">
          <AdminCard title="Recruiter notes" description="Current notes connected to the candidate review.">
            {notes ? (
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {notes}
              </div>
            ) : (
              <EmptyState title="No recruiter notes" description="Recruiter notes will appear here when the backend returns them." />
            )}
          </AdminCard>

          <AdminCard title="Profile snapshot" description="Quick context from the candidate record.">
            <div className="space-y-3">
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <UserRound className="h-4 w-4" />
                  Email
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950">{candidate.email || 'Not provided'}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <FileText className="h-4 w-4" />
                  Applied Position
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950">{detail.applied_position || 'Open role'}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  <Sparkles className="h-4 w-4" />
                  Match Score
                </div>
                <p className="mt-2 text-sm font-medium text-slate-950">{formatMetricPercent(detail.primary_match ?? candidate.ai_score ?? candidate.overall_score)}</p>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="AI recommendation" description="The model recommendation pulled from the backend response.">
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-white">
                  <BadgeCheck className="h-4 w-4 text-slate-700" />
                </div>
                <p className="text-sm leading-6 text-slate-600">{recommendation}</p>
              </div>
              <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-white">
                  <GraduationCap className="h-4 w-4 text-slate-700" />
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Interview status is currently <span className="font-semibold text-slate-950">{interviewStatus}</span>.
                </p>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Available actions" description="Recruiter workflow shortcuts for this candidate.">
            <div className="space-y-3">
              <Button as={Link} to="/admin/candidates" variant="secondary" className="w-full">
                Back to candidates
              </Button>
              <Button type="button" variant="secondary" className="w-full">
                Generate PDF
              </Button>
              {candidate.email ? (
                <Button as="a" href={`mailto:${candidate.email}`} variant="primary" className="w-full">
                  Send Email
                </Button>
              ) : (
                <Button type="button" variant="primary" className="w-full" disabled>
                  Send Email
                </Button>
              )}
            </div>
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}
