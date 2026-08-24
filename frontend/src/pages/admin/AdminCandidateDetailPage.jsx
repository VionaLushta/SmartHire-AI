import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  CalendarDays,
  Eye,
  FileDown,
  Layers3,
  MessageSquareText,
  Star,
  Upload,
  X,
} from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/admin/StatusBadge';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse, formatDateShort, formatDateTimeShort, formatMetricPercent } from '../../utils/dashboard';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'resume', label: 'Resume' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'skills', label: 'Skills' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'history', label: 'History' },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    if (typeof value === 'string' && !value.trim()) {
      continue;
    }
    return value;
  }
  return null;
}

function textValue(value, fallback = 'Not provided') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function formatPlainDate(value) {
  return value ? formatDateShort(value) : 'Not provided';
}

function normalizeUrl(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/') || text.startsWith('data:') || text.startsWith('blob:')) {
    return text;
  }
  return '';
}

function fileExtension(url = '') {
  const clean = String(url).split('?')[0];
  const parts = clean.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function isPdfDocument(doc) {
  const mime = String(doc.mimeType || doc.mime_type || doc.content_type || '').toLowerCase();
  return mime.includes('pdf') || fileExtension(doc.previewUrl || doc.url || doc.filePath) === 'pdf';
}

function isImageDocument(doc) {
  const mime = String(doc.mimeType || doc.mime_type || doc.content_type || '').toLowerCase();
  const ext = fileExtension(doc.previewUrl || doc.url || doc.filePath);
  return mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
}

function normalizeDocument(doc = {}, index = 0, kind = 'document') {
  const url = normalizeUrl(doc.download_url || doc.file_url || doc.preview_url || doc.url || doc.file_path || doc.path);
  return {
    id: doc.id || doc.cert_id || doc.document_id || doc.resume_id || `${kind}-${index + 1}`,
    title: doc.title || doc.name || doc.file_name || doc.filename || `${kind === 'resume' ? 'Resume' : 'Document'} ${index + 1}`,
    issuer: doc.issuer || doc.organization || doc.source || 'Uploaded document',
    uploadDate: doc.uploaded_at || doc.created_at || doc.issue_date || doc.updated_at || null,
    mimeType: doc.mime_type || doc.content_type || doc.type || '',
    url,
    previewUrl: normalizeUrl(doc.preview_url || doc.previewUrl || url),
    text: doc.parsed_text || doc.text || doc.preview_text || '',
    kind,
  };
}

function buildExperienceDisplay(candidate) {
  const direct = firstValue(
    candidate.years_of_experience,
    candidate.experience_years,
    candidate.total_experience_years,
    candidate.total_years_experience,
    candidate.years_experience,
  );

  if (typeof direct === 'number' && !Number.isNaN(direct)) {
    return `${Math.max(0, direct)} years`;
  }

  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const experiences = asArray(
    candidate.work_experience ||
      candidate.experience ||
      candidate.employment_history ||
      candidate.jobs ||
      candidate.positions,
  );

  if (!experiences.length) {
    return 'Not provided';
  }

  let totalYears = 0;
  experiences.forEach((entry) => {
    const start = entry.start_date || entry.from || entry.begin_date;
    const end = entry.end_date || entry.to || entry.finish_date || (entry.current ? new Date().toISOString() : null);
    if (!start || !end) return;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) return;
    totalYears += (endTime - startTime) / (365.25 * 24 * 60 * 60 * 1000);
  });

  if (!totalYears) {
    return 'Not provided';
  }

  return `${Math.max(1, Math.round(totalYears))} years`;
}

function normalizeCandidateData(analytics = {}) {
  const candidate = analytics.candidate || analytics.profile || analytics.user || analytics || {};
  const resumeSource = candidate.resume || analytics.resume || analytics.uploaded_resume || candidate.uploaded_resume || {};
  const resumePreviewUrl = normalizeUrl(resumeSource.preview_url || resumeSource.previewUrl || resumeSource.file_url || resumeSource.url || resumeSource.file_path || resumeSource.path);
  const resumeText = resumeSource.parsed_text || resumeSource.text || analytics.resume_preview || candidate.resume_preview || '';
  const certificatesSource = asArray(
    analytics.certificates ||
      candidate.certificates ||
      resumeSource.certificates ||
      analytics.documents?.certificates ||
      candidate.documents?.certificates,
  );
  const skillsDetected = asArray(
    analytics.detected_skills ||
      analytics.skill_gap_analysis?.most_common_skills ||
      candidate.detected_skills ||
      candidate.skills,
  );
  const skillsMissing = asArray(
    analytics.missing_skills ||
      analytics.skill_gap_analysis?.most_missing_skills ||
      candidate.missing_skills,
  );
  const skillsOptional = asArray(
    analytics.optional_skills ||
      analytics.skill_gap_analysis?.optional_skills ||
      candidate.optional_skills ||
      analytics.skill_gap_analysis?.recommended_skills,
  );
  const skillsRequired = asArray(
    analytics.required_skills ||
      analytics.skill_gap_analysis?.most_requested_skills ||
      candidate.required_skills ||
      analytics.job?.required_skills ||
      analytics.job_requirements?.required_skills,
  );
  const strengths = asArray(analytics.strengths || candidate.strengths || analytics.ai_strengths);
  const weaknesses = asArray(analytics.weaknesses || candidate.weaknesses || analytics.ai_weaknesses);
  const historySource = asArray(
    analytics.history ||
      analytics.timeline ||
      analytics.activity ||
      candidate.history ||
      candidate.timeline ||
      candidate.activity,
  );
  const tags = asArray(analytics.tags || candidate.tags || candidate.labels);
  const candidateName =
    candidate.candidate_name ||
    [candidate.first_name, candidate.last_name].filter(Boolean).join(' ').trim() ||
    candidate.name ||
    'Candidate';
  const applicantStatus =
    candidate.status ||
    candidate.pipeline_status ||
    candidate.application_status ||
    candidate.interview_status ||
    analytics.status ||
    'Not provided';

  return {
    candidate,
    candidateName,
    email: candidate.email || candidate.candidate_email || 'Not provided',
    phone: candidate.phone || candidate.phone_number || 'Not provided',
    university:
      candidate.university ||
      candidate.institution ||
      candidate.education?.[0]?.institution ||
      candidate.education_summary?.university ||
      'Not provided',
    degree:
      candidate.degree ||
      candidate.education?.[0]?.degree ||
      candidate.education_summary?.degree ||
      'Not provided',
    yearsOfExperience: buildExperienceDisplay(candidate),
    appliedPosition:
      candidate.applied_position ||
      candidate.job_title ||
      candidate.position ||
      candidate.target_role ||
      analytics.applied_position ||
      'Not provided',
    currentStatus: applicantStatus,
    applicationDate:
      candidate.applied_at ||
      candidate.application_date ||
      candidate.created_at ||
      analytics.application_date ||
      analytics.applied_at ||
      null,
    recruiterAssigned:
      candidate.recruiter_assigned ||
      candidate.assigned_recruiter ||
      candidate.recruiter ||
      analytics.recruiter_assigned ||
      analytics.recruiter ||
      'Not provided',
    overallMatchScore: firstValue(
      analytics.metrics?.average_ai_match_score,
      candidate.overall_match_score,
      candidate.ai_score,
      candidate.overall_score,
    ),
    primaryMatch: firstValue(candidate.primary_match, candidate.skill_match, candidate.ai_score, candidate.overall_score, analytics.primary_match),
    secondaryMatch: firstValue(candidate.secondary_match, candidate.experience_match, analytics.secondary_match, candidate.match_score_secondary),
    secondaryRole:
      candidate.secondary_role ||
      candidate.alternative_role ||
      candidate.matched_role ||
      candidate.recommended_role ||
      analytics.secondary_role ||
      'Not provided',
    interviewStage:
      candidate.interview_stage ||
      candidate.interview_status ||
      candidate.current_stage ||
      analytics.interview_stage ||
      'Not provided',
    professionalSummary:
      candidate.professional_summary ||
      candidate.summary ||
      candidate.bio ||
      analytics.summary ||
      analytics.professional_summary ||
      'No professional summary available.',
    applicationInformation:
      candidate.application_information ||
      analytics.application_information ||
      analytics.insights?.[0] ||
      'No additional application information available.',
    aiRecommendation:
      analytics.ai_recommendation ||
      candidate.ai_recommendation ||
      candidate.recommendation ||
      analytics.insights?.[0] ||
      'No AI recommendation available.',
    reasoningSummary:
      analytics.reasoning_summary ||
      analytics.reasoning ||
      candidate.reasoning_summary ||
      candidate.reasoning ||
      analytics.insights?.[1] ||
      'No reasoning summary available.',
    confidenceScore: firstValue(
      analytics.confidence_score,
      analytics.confidence,
      candidate.confidence_score,
      candidate.match_confidence,
    ),
    resumeSimilarity: firstValue(
      analytics.resume_similarity,
      analytics.metrics?.resume_similarity,
      candidate.resume_similarity,
      candidate.resume_match,
      candidate.resume_match_score,
    ),
    skillMatch: firstValue(
      analytics.skill_match,
      analytics.metrics?.skill_match,
      candidate.skill_match,
      candidate.skills_score,
    ),
    experienceMatch: firstValue(
      analytics.experience_match,
      analytics.metrics?.experience_match,
      candidate.experience_match,
    ),
    educationMatch: firstValue(
      analytics.education_match,
      analytics.metrics?.education_match,
      candidate.education_match,
    ),
    certificatesMatch: firstValue(
      analytics.certificates_match,
      analytics.metrics?.certificates_match,
      candidate.certificates_match,
    ),
    languageMatch: firstValue(
      analytics.language_match,
      analytics.metrics?.language_match,
      candidate.language_match,
    ),
    recruiterNotes: candidate.recruiter_notes || analytics.recruiter_notes || candidate.notes || '',
    requiredSkills: skillsRequired,
    tags,
    resume: {
      ...normalizeDocument(resumeSource, 0, 'resume'),
      previewUrl: resumePreviewUrl,
      text: resumeText,
    },
    hasResume: Boolean(resumePreviewUrl || resumeText),
    certificateDocuments: certificatesSource.map((doc, index) => normalizeDocument(doc, index, 'certificate')),
    detectedSkills: skillsDetected,
    missingSkills: skillsMissing,
    optionalSkills: skillsOptional,
    strengths,
    weaknesses,
    historySource,
    statusTone:
      String(applicantStatus || '').toLowerCase().includes('reject')
        ? 'danger'
        : String(applicantStatus || '').toLowerCase().includes('accept')
          ? 'success'
          : String(applicantStatus || '').toLowerCase().includes('interview')
            ? 'warning'
            : 'neutral',
  };
}

function buildHistoryEvents(workspace, evaluation = null) {
  const events = [];
  const push = (title, description, date, tone = 'neutral') => {
    events.push({ id: `${title}-${events.length + 1}`, title, description, date, tone });
  };

  if (workspace.historySource.length) {
    workspace.historySource.forEach((entry, index) => {
      events.push({
        id: entry.id || entry.event_id || `${index + 1}`,
        title: entry.title || entry.event || entry.name || entry.status || `Event ${index + 1}`,
        description: entry.description || entry.detail || entry.message || '',
        date: entry.date || entry.created_at || entry.timestamp || entry.time || null,
        tone: entry.tone || 'neutral',
      });
    });
  } else {
    push(
      'Application Submitted',
      workspace.applicationDate ? `Submitted on ${formatPlainDate(workspace.applicationDate)}.` : 'No application timestamp available.',
      workspace.applicationDate,
    );

    if (workspace.hasResume) {
      push(
        'CV Processed',
        workspace.resume.uploadDate ? `Resume uploaded on ${formatPlainDate(workspace.resume.uploadDate)}.` : 'Resume is on file.',
        workspace.resume.uploadDate,
      );
      if (workspace.resume.previewUrl || workspace.resume.url || workspace.resume.text) {
        push(
          'OCR Completed',
          workspace.resume.previewUrl ? 'Parsed text preview is available.' : 'Document was ingested and processed.',
          workspace.resume.uploadDate,
        );
      }
    }

    if (workspace.overallMatchScore !== null && workspace.overallMatchScore !== undefined) {
      push(
        'AI Matching Completed',
        `Overall match score is ${formatMetricPercent(workspace.overallMatchScore)}.`,
        workspace.applicationDate,
        'blue',
      );
    }

    if (workspace.recruiterAssigned !== 'Not provided' || workspace.recruiterNotes) {
      push(
        'Recruiter Viewed Profile',
        workspace.recruiterAssigned !== 'Not provided'
          ? `Assigned to ${workspace.recruiterAssigned}.`
          : 'Recruiter notes are available for review.',
        workspace.applicationDate,
        'slate',
      );
    }

    if (String(workspace.interviewStage || '').toLowerCase().includes('interview') || String(workspace.currentStatus || '').toLowerCase().includes('interview')) {
      push(
        'Interview Scheduled',
        `Current interview stage: ${workspace.interviewStage}.`,
        workspace.applicationDate,
        'warning',
      );
    }

    const currentStatus = String(workspace.currentStatus || '').toLowerCase();
    if (currentStatus.includes('accept')) {
      push('Accepted', 'Candidate is marked as accepted.', workspace.applicationDate, 'success');
    } else if (currentStatus.includes('reject')) {
      push('Rejected', 'Candidate is marked as rejected.', workspace.applicationDate, 'danger');
    }
  }

  if (evaluation?.savedAt) {
    push(
      'Recruiter Evaluation Saved',
      `Decision recorded as ${buildDecisionLabel(evaluation.decision)}.`,
      evaluation.savedAt,
      evaluation.decision === 'reject' ? 'danger' : evaluation.decision === 'accept' ? 'success' : evaluation.decision === 'interview' ? 'warning' : 'neutral',
    );
  }

  if (evaluation?.interviewDate || evaluation?.interviewTime || evaluation?.interviewerName) {
    const interviewDate = [evaluation.interviewDate, evaluation.interviewTime].filter(Boolean).join('T');
    push(
      'Interview Scheduled',
      [evaluation.interviewType, evaluation.interviewerName].filter(Boolean).join(' · ') || 'Interview details recorded.',
      interviewDate || evaluation.savedAt || null,
      'warning',
    );
  }

  return events.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
}

function tabButtonClass(isActive) {
  return [
    'inline-flex min-w-max items-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-semibold transition duration-150 ease-out',
    isActive
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-[rgba(15,23,42,0.08)] bg-white text-slate-600 hover:border-[rgba(15,23,42,0.12)] hover:bg-slate-50 hover:text-slate-900',
  ].join(' ');
}

function statusToneClass(tone) {
  const tones = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
    danger: 'border-rose-200 bg-rose-50 text-rose-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return tones[tone] || tones.neutral;
}

function Timeline({ events = [] }) {
  if (!events.length) {
    return <EmptyState title="No activity found" description="Timeline events will appear when the backend returns candidate history." />;
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <article key={event.id || `${event.title}-${index}`} className="relative rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-4 pl-5">
          <div className="absolute left-0 top-5 h-10 w-1 rounded-full bg-slate-900" />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold tracking-[-0.02em] text-slate-950">{event.title}</h4>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusToneClass(event.tone)}`}>
                  {index + 1}
                </span>
              </div>
              {event.description ? <p className="text-sm leading-6 text-slate-600">{event.description}</p> : null}
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              {event.date ? formatDateTimeShort(event.date) : 'Not dated'}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function DocumentPreview({ document, fallbackLabel = 'No preview available' }) {
  if (!document || !document.previewUrl) {
    return (
      <div className="flex h-52 items-center justify-center rounded-[16px] border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
        {fallbackLabel}
      </div>
    );
  }

  if (isImageDocument(document)) {
    return <img src={document.previewUrl} alt={document.title} className="h-52 w-full rounded-[16px] border border-[rgba(15,23,42,0.08)] object-contain bg-white" />;
  }

  if (isPdfDocument(document)) {
    return <iframe title={document.title} src={document.previewUrl} className="h-52 w-full rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white" />;
  }

  return (
    <div className="flex h-52 items-center justify-center rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 text-center text-sm text-slate-500">
      Preview not supported for this file type.
    </div>
  );
}

function buildDecisionLabel(value) {
  const label = String(value || '').trim();
  if (!label) return 'Not selected';
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function normalizeSkillItems(items = []) {
  return asArray(items)
    .map((item) => {
      if (typeof item === 'string') {
        const value = item.trim();
        return value ? { label: value } : null;
      }
      const label = item?.label || item?.name || item?.title || item?.skill || item?.value;
      if (!label) return null;
      return {
        label: String(label).trim(),
        status: item?.status || item?.tone || item?.match_status || null,
      };
    })
    .filter(Boolean);
}

function getSavedEvaluationKey(candidateId) {
  return candidateId ? `smarthire.admin.candidate-evaluation.${candidateId}` : '';
}

function readSavedEvaluation(candidateId) {
  if (typeof window === 'undefined' || !candidateId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getSavedEvaluationKey(candidateId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function buildDefaultEvaluation(workspace) {
  return {
    decision: 'hold',
    notes: workspace.recruiterNotes || '',
    rating: 3,
    interviewDate: '',
    interviewTime: '',
    interviewerName: workspace.recruiterAssigned !== 'Not provided' ? workspace.recruiterAssigned : '',
    interviewType: 'online',
    savedAt: null,
  };
}

function normalizeDecisionState(savedEvaluation, workspace) {
  const defaults = buildDefaultEvaluation(workspace);
  if (!savedEvaluation) return defaults;

  return {
    ...defaults,
    decision: savedEvaluation.decision || defaults.decision,
    notes: savedEvaluation.notes ?? defaults.notes,
    rating: Number(savedEvaluation.rating || defaults.rating) || defaults.rating,
    interviewDate: savedEvaluation.interviewDate || '',
    interviewTime: savedEvaluation.interviewTime || '',
    interviewerName: savedEvaluation.interviewerName || defaults.interviewerName,
    interviewType: savedEvaluation.interviewType || defaults.interviewType,
    savedAt: savedEvaluation.savedAt || null,
  };
}

function buildEvaluationMetrics(workspace) {
  return [
    {
      label: 'Overall Match Score',
      value: workspace.overallMatchScore,
      hint: 'Aggregate fit signal from the analytics engine.',
    },
    {
      label: 'Resume Similarity',
      value: workspace.resumeSimilarity,
      hint: 'Similarity between the resume and the target role.',
    },
    {
      label: 'Skill Match',
      value: workspace.skillMatch,
      hint: 'Technical and functional skill alignment.',
    },
    {
      label: 'Experience Match',
      value: workspace.experienceMatch,
      hint: 'Relevant depth of experience for the role.',
    },
    {
      label: 'Education Match',
      value: workspace.educationMatch,
      hint: 'Education fit compared with the job criteria.',
    },
    {
      label: 'Certificates Match',
      value: workspace.certificatesMatch,
      hint: 'Documented certifications and evidence.',
    },
    {
      label: 'Language Match',
      value: workspace.languageMatch,
      hint: 'Language or communication fit when available.',
    },
  ];
}

function buildSkillGroups(workspace) {
  return {
    required: normalizeSkillItems(workspace.requiredSkills),
    optional: normalizeSkillItems(workspace.optionalSkills),
    detected: normalizeSkillItems(workspace.detectedSkills),
    missing: normalizeSkillItems(workspace.missingSkills),
  };
}

function formatScoreValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Not available';
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      return formatMetricPercent(trimmed);
    }
    return trimmed;
  }

  return formatMetricPercent(value);
}

function MetricCard({ label, value, hint }) {
  const metricValue = formatScoreValue(value);

  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{metricValue}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

function SkillGroupCard({ title, items = [], tone = 'neutral', emptyLabel = 'No skills available.' }) {
  const iconClass = tone === 'danger' ? 'text-rose-600' : tone === 'warning' ? 'text-amber-600' : tone === 'success' ? 'text-emerald-600' : 'text-slate-500';

  return (
    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</h4>
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{items.length} items</span>
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${title}-${item.label}-${index}`} className="flex items-center gap-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-2">
              {tone === 'danger' ? (
                <X className={`h-4 w-4 ${iconClass}`} />
              ) : (
                <CheckCircle2 className={`h-4 w-4 ${iconClass}`} />
              )}
              <span className="text-sm font-medium text-slate-800">{item.label}</span>
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-slate-500">{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function RatingPill({ value, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex h-11 min-w-11 items-center justify-center rounded-[14px] border px-3 text-sm font-semibold transition duration-150 ease-out',
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-[rgba(15,23,42,0.08)] bg-white text-slate-700 hover:bg-slate-50',
      ].join(' ')}
    >
      <Star className="mr-1.5 h-4 w-4" />
      {value}
    </button>
  );
}

function DecisionButton({ active, label, description, onClick, tone = 'neutral' }) {
  const toneClass =
    tone === 'danger'
      ? active
        ? 'border-rose-600 bg-rose-600 text-white'
        : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
      : tone === 'success'
        ? active
          ? 'border-emerald-600 bg-emerald-600 text-white'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        : tone === 'warning'
          ? active
            ? 'border-amber-600 bg-amber-600 text-white'
            : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : active
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-[rgba(15,23,42,0.08)] bg-white text-slate-700 hover:bg-slate-50';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-[16px] border px-4 py-3 text-left transition duration-150 ease-out ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        {active ? <CheckCircle2 className="h-4 w-4" /> : null}
      </div>
      <p className="mt-1 text-xs leading-5 opacity-80">{description}</p>
    </button>
  );
}

export default function AdminCandidateDetailPage() {
  const { candidateId } = useParams();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [resumeFullscreenOpen, setResumeFullscreenOpen] = useState(false);
  const [evaluation, setEvaluation] = useState(() => buildDefaultEvaluation({}));
  const [evaluationMessage, setEvaluationMessage] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCandidate() {
      try {
        setError(null);
        setLoading(true);
        const response = await analyticsService.candidate(candidateId);
        const data = unwrapResponse(response) || {};
        if (mounted) {
          setAnalytics(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.detail || 'Unable to load candidate details.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (candidateId) {
      loadCandidate();
    }

    return () => {
      mounted = false;
    };
  }, [candidateId]);

  const workspace = useMemo(() => normalizeCandidateData(analytics || {}), [analytics]);
  useEffect(() => {
    if (!candidateId) return;
    const savedEvaluation = readSavedEvaluation(candidateId);
    setEvaluation(normalizeDecisionState(savedEvaluation, workspace));
    setEvaluationMessage(savedEvaluation ? 'Saved evaluation loaded from this browser.' : '');
  }, [candidateId, workspace]);

  const historyEvents = useMemo(() => buildHistoryEvents(workspace, evaluation), [workspace, evaluation]);
  const evaluationMetrics = useMemo(() => buildEvaluationMetrics(workspace), [workspace]);
  const skillGroups = useMemo(() => buildSkillGroups(workspace), [workspace]);
  const resumeUrl = workspace.resume.previewUrl || workspace.resume.url;
  const resumeDownloadUrl = workspace.resume.url || workspace.resume.previewUrl;
  const certificateDownloadUrl = workspace.certificateDocuments.find((doc) => doc.url)?.url || '';
  const activeDecision = evaluation.decision || 'hold';
  const summaryStats = [
    { label: 'Candidate', value: workspace.candidateName },
    { label: 'Applied Position', value: workspace.appliedPosition },
    { label: 'Current Status', value: workspace.currentStatus },
    { label: 'Overall Match', value: workspace.overallMatchScore !== null && workspace.overallMatchScore !== undefined ? formatMetricPercent(workspace.overallMatchScore) : 'Not scored' },
  ];

  const applicationInfo = [
    { label: 'Application Date', value: formatPlainDate(workspace.applicationDate) },
    { label: 'Recruiter Assigned', value: textValue(workspace.recruiterAssigned) },
    { label: 'Years of Experience', value: textValue(workspace.yearsOfExperience) },
    { label: 'University', value: textValue(workspace.university) },
    { label: 'Degree', value: textValue(workspace.degree) },
    { label: 'Interview Stage', value: textValue(workspace.interviewStage) },
  ];

  const handleEvaluationChange = (key, value) => {
    setEvaluation((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const openResumeDownload = () => {
    if (!resumeDownloadUrl) {
      setActiveTab('resume');
      return;
    }
    window.open(resumeDownloadUrl, '_blank', 'noopener,noreferrer');
  };

  const openCertificates = () => {
    if (!certificateDownloadUrl) {
      setActiveTab('certificates');
      return;
    }
    window.open(certificateDownloadUrl, '_blank', 'noopener,noreferrer');
  };

  const saveEvaluation = async () => {
    if (!candidateId || typeof window === 'undefined') return;

    const payload = {
      decision: evaluation.decision,
      notes: evaluation.notes,
      rating: evaluation.rating,
      interviewDate: evaluation.interviewDate,
      interviewTime: evaluation.interviewTime,
      interviewerName: evaluation.interviewerName,
      interviewType: evaluation.interviewType,
      savedAt: new Date().toISOString(),
      candidateId,
    };

    try {
      setSavingEvaluation(true);
      window.localStorage.setItem(getSavedEvaluationKey(candidateId), JSON.stringify(payload));
      setEvaluation((current) => ({
        ...current,
        savedAt: payload.savedAt,
      }));
      setEvaluationMessage(`Evaluation saved at ${formatDateTimeShort(payload.savedAt)}.`);
    } catch (err) {
      setEvaluationMessage(err?.message || 'Unable to save the evaluation locally.');
    } finally {
      setSavingEvaluation(false);
    }
  };

  if (loading) {
    return <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading candidate workspace...</div>;
  }

  if (error && !analytics) {
    return (
      <div className="rounded-[16px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button as={Link} to="/admin/candidates" variant="secondary">
          <ArrowLeft className="h-4 w-4" />
          Back to candidates
        </Button>
        <StatusBadge status={workspace.currentStatus} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_2fr_1fr]">
        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <AdminCard title="Candidate Summary" description="Primary profile context for recruiter review.">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar initials={[workspace.candidate.first_name, workspace.candidate.last_name].filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CA'} size="lg" className="ring-0" />
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-slate-950">{workspace.candidateName}</h2>
                  <p className="mt-1 text-sm text-slate-500">{textValue(workspace.email)}</p>
                </div>
              </div>

              {workspace.candidate.profile_picture_url ? (
                <img
                  src={workspace.candidate.profile_picture_url}
                  alt={workspace.candidateName}
                  className="h-32 w-full rounded-[16px] border border-[rgba(15,23,42,0.08)] object-cover"
                />
              ) : null}

              <div className="space-y-3">
                {summaryStats.map((item) => (
                  <div key={item.label} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-950">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3">
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Phone Number</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.phone)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">University</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.university)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Degree</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.degree)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Years of Experience</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.yearsOfExperience)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Applied Position</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.appliedPosition)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Current Status</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.currentStatus)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Application Date</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{formatPlainDate(workspace.applicationDate)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recruiter Assigned</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">{textValue(workspace.recruiterAssigned)}</p>
                </div>
                <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Overall Match Score</p>
                  <p className="mt-2 text-sm font-medium text-slate-950">
                    {workspace.overallMatchScore !== null && workspace.overallMatchScore !== undefined
                      ? formatMetricPercent(workspace.overallMatchScore)
                      : 'Not scored'}
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <Button type="button" variant="secondary" onClick={openResumeDownload} className="w-full">
                  <FileDown className="h-4 w-4" />
                  Download Resume
                </Button>
                <Button type="button" variant="secondary" onClick={openCertificates} className="w-full">
                  <Upload className="h-4 w-4" />
                  Download Certificates
                </Button>
              </div>
            </div>
          </AdminCard>
        </aside>

        <section className="space-y-6">
          <AdminCard
            title="Evaluation"
            description="Review AI signals, compare skill fit, and record the hiring decision."
            action={(
              <Button type="button" variant="primary" onClick={saveEvaluation} loading={savingEvaluation}>
                Save Evaluation
              </Button>
            )}
          >
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {evaluationMetrics.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SkillGroupCard
                      title="Required Skills"
                      items={skillGroups.required}
                      tone="success"
                      emptyLabel="No required skills were returned for this job."
                    />
                    <SkillGroupCard
                      title="Optional Skills"
                      items={skillGroups.optional}
                      tone="neutral"
                      emptyLabel="No optional skills were returned for this job."
                    />
                    <SkillGroupCard
                      title="Detected Skills"
                      items={skillGroups.detected}
                      tone="success"
                      emptyLabel="No detected skills were returned by the backend."
                    />
                    <SkillGroupCard
                      title="Missing Skills"
                      items={skillGroups.missing}
                      tone="danger"
                      emptyLabel="No missing skills are available for this candidate."
                    />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Top Candidate Strengths</p>
                      <div className="mt-4 space-y-2">
                        {workspace.strengths.length ? (
                          workspace.strengths.map((item, index) => (
                            <div key={`strength-${index}`} className="flex items-start gap-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                              <span className="text-sm leading-6 text-slate-700">{typeof item === 'string' ? item : item.label || item.name || String(item)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm leading-6 text-slate-500">No strengths available from the analytics feed.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Weaknesses</p>
                      <div className="mt-4 space-y-2">
                        {workspace.weaknesses.length ? (
                          workspace.weaknesses.map((item, index) => (
                            <div key={`weakness-${index}`} className="flex items-start gap-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-2">
                              <Layers3 className="mt-0.5 h-4 w-4 text-amber-600" />
                              <span className="text-sm leading-6 text-slate-700">{typeof item === 'string' ? item : item.label || item.name || String(item)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm leading-6 text-slate-500">No weaknesses available from the analytics feed.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AI Decision</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Overall Recommendation</p>
                        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{textValue(workspace.aiRecommendation, 'No AI recommendation available.')}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Confidence Score</p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                            {workspace.confidenceScore !== null && workspace.confidenceScore !== undefined ? formatMetricPercent(workspace.confidenceScore) : 'Not available'}
                          </p>
                        </div>
                        <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Suggested Alternative Position</p>
                          <p className="mt-2 text-base font-semibold tracking-[-0.03em] text-slate-950">{textValue(workspace.secondaryRole)}</p>
                        </div>
                      </div>
                      <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Reasoning Summary</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{textValue(workspace.reasoningSummary, 'No reasoning summary available.')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Application Timeline</p>
                        <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">Chronological activity</h4>
                      </div>
                      <Badge tone="neutral">{historyEvents.length} events</Badge>
                    </div>
                    <div className="mt-4 max-h-[34rem] overflow-auto pr-1">
                      <Timeline events={historyEvents} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                The evaluation panel stays read-only for AI outputs and saves recruiter input locally until the backend decision workflow is available.
              </div>
            </div>
          </AdminCard>

          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={tabButtonClass(activeTab === tab.id)}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <AdminCard className="min-h-[40rem]">
            {activeTab === 'overview' ? (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Professional Summary</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{workspace.professionalSummary}</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Application Information</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {applicationInfo.map((item) => (
                        <div key={item.label} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                          <p className="mt-2 text-sm font-medium text-slate-950">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Primary Match Score</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {workspace.primaryMatch !== null && workspace.primaryMatch !== undefined ? formatMetricPercent(workspace.primaryMatch) : 'Not scored'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Core fit score extracted from the candidate analytics payload.</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Secondary Recommended Position</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{textValue(workspace.secondaryRole)}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">Alternative role suggestion from the matching engine.</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Current Hiring Status</p>
                    <div className="mt-3">
                      <StatusBadge status={workspace.currentStatus} />
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Interview Stage</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{textValue(workspace.interviewStage)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'resume' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resume</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Document preview</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => setResumeFullscreenOpen(true)}>
                      <Eye className="h-4 w-4" />
                      Open Full Screen
                    </Button>
                    {resumeDownloadUrl ? (
                      <Button as="a" href={resumeDownloadUrl} target="_blank" rel="noreferrer" variant="primary" download>
                        <FileDown className="h-4 w-4" />
                        Download Resume
                      </Button>
                    ) : (
                      <Button type="button" variant="primary" disabled>
                        <FileDown className="h-4 w-4" />
                        Download Resume
                      </Button>
                    )}
                  </div>
                </div>

                {resumeUrl ? (
                  <div className="overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white">
                    <iframe
                      title="Resume preview"
                      src={resumeUrl}
                      className="h-[42rem] w-full bg-white"
                    />
                  </div>
                ) : workspace.hasResume ? (
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Resume available in text form</p>
                    <pre className="mt-4 max-h-[42rem] overflow-auto whitespace-pre-wrap rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4 text-sm leading-6 text-slate-700">
                      {workspace.resume.text || 'No parsed resume text available.'}
                    </pre>
                  </div>
                ) : (
                  <EmptyState
                    title="Resume preview unavailable"
                    description="The backend has not returned a resume document for this candidate yet."
                  />
                )}
              </div>
            ) : null}

            {activeTab === 'certificates' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Certificates</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Uploaded documents</h3>
                </div>

                {workspace.certificateDocuments.length ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    {workspace.certificateDocuments.map((doc) => (
                      <article key={doc.id} className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{doc.title}</h4>
                            <p className="mt-1 text-sm text-slate-500">{doc.issuer}</p>
                          </div>
                          <Badge tone="neutral">{doc.kind || 'Document'}</Badge>
                        </div>

                        <div className="mt-4">
                          <DocumentPreview
                            document={doc}
                            fallbackLabel="Certificate preview unavailable."
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                            Uploaded {doc.uploadDate ? formatPlainDate(doc.uploadDate) : 'Recently'}
                          </p>
                          {doc.url ? (
                            <Button as="a" href={doc.url} target="_blank" rel="noreferrer" variant="secondary" size="sm" download>
                              <FileDown className="h-4 w-4" />
                              Download
                            </Button>
                          ) : (
                            <Button type="button" variant="secondary" size="sm" disabled>
                              <FileDown className="h-4 w-4" />
                              Download
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No certificates uploaded"
                    description="Uploaded certificates will appear here as PDFs or image files."
                  />
                )}
              </div>
            ) : null}

            {activeTab === 'skills' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Skills</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Required, optional, detected, and missing skills</h3>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <SkillGroupCard
                    title="Required Skills"
                    items={skillGroups.required}
                    tone="success"
                    emptyLabel="Required skills are not available for this candidate."
                  />
                  <SkillGroupCard
                    title="Optional Skills"
                    items={skillGroups.optional}
                    tone="neutral"
                    emptyLabel="Optional skills are not available right now."
                  />
                  <SkillGroupCard
                    title="Detected Skills"
                    items={skillGroups.detected}
                    tone="success"
                    emptyLabel="Detected skills have not been returned by the backend."
                  />
                  <SkillGroupCard
                    title="Missing Skills"
                    items={skillGroups.missing}
                    tone="danger"
                    emptyLabel="Missing skills are unavailable for this candidate."
                  />
                </div>
              </div>
            ) : null}

            {activeTab === 'insights' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AI Insights</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Evaluation summary</h3>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Overall Match Score</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {workspace.overallMatchScore !== null && workspace.overallMatchScore !== undefined ? formatMetricPercent(workspace.overallMatchScore) : 'Not scored'}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Primary Match</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {workspace.primaryMatch !== null && workspace.primaryMatch !== undefined ? formatMetricPercent(workspace.primaryMatch) : 'Not scored'}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Secondary Match</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {workspace.secondaryMatch !== null && workspace.secondaryMatch !== undefined ? formatMetricPercent(workspace.secondaryMatch) : 'Not scored'}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Confidence Score</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {workspace.confidenceScore !== null && workspace.confidenceScore !== undefined ? formatMetricPercent(workspace.confidenceScore) : 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AI Recommendation</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{textValue(workspace.aiRecommendation, 'No AI recommendation available.')}</p>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Candidate Strengths</p>
                    <div className="mt-4 space-y-2">
                      {workspace.strengths.length ? (
                        workspace.strengths.map((item, index) => (
                          <div key={`strength-${index}`} className="flex items-start gap-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                            <span className="text-sm text-slate-700">{typeof item === 'string' ? item : item.label || item.name || String(item)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No strengths available.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Candidate Weaknesses</p>
                    <div className="mt-4 space-y-2">
                      {workspace.weaknesses.length ? (
                        workspace.weaknesses.map((item, index) => (
                          <div key={`weakness-${index}`} className="flex items-start gap-3 rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-2">
                            <Layers3 className="mt-0.5 h-4 w-4 text-amber-600" />
                            <span className="text-sm text-slate-700">{typeof item === 'string' ? item : item.label || item.name || String(item)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No weaknesses available.</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 lg:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Reasoning Summary</p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{textValue(workspace.reasoningSummary, 'No reasoning summary available.')}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">Suggested Alternative Role</span>
                      <Badge tone="neutral">{textValue(workspace.secondaryRole)}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'history' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">History</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">Chronological activity</h3>
                </div>
                <Timeline events={historyEvents} />
              </div>
            ) : null}
          </AdminCard>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <AdminCard title="Recruiter Workspace" description="Decisioning, notes, and interview planning.">
            <div className="space-y-4">
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-slate-500" />
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recruiter Notes</p>
                </div>
                <textarea
                  value={evaluation.notes}
                  onChange={(event) => handleEvaluationChange('notes', event.target.value)}
                  rows={7}
                  placeholder="Capture internal observations, risks, and follow-up items."
                  className="mt-2 w-full resize-none rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-white p-3 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                />
              </div>

              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Recruiter Decision</p>
                <div className="mt-4 grid gap-3">
                  <DecisionButton
                    label="Accept"
                    description="Move the candidate toward an offer-ready state."
                    tone="success"
                    active={activeDecision === 'accept'}
                    onClick={() => handleEvaluationChange('decision', 'accept')}
                  />
                  <DecisionButton
                    label="Interview"
                    description="Continue the process with an interview step."
                    tone="warning"
                    active={activeDecision === 'interview'}
                    onClick={() => handleEvaluationChange('decision', 'interview')}
                  />
                  <DecisionButton
                    label="Hold"
                    description="Keep the profile in review for later."
                    active={activeDecision === 'hold'}
                    onClick={() => handleEvaluationChange('decision', 'hold')}
                  />
                  <DecisionButton
                    label="Reject"
                    description="Close the application from the pipeline."
                    tone="danger"
                    active={activeDecision === 'reject'}
                    onClick={() => handleEvaluationChange('decision', 'reject')}
                  />
                </div>
              </div>

              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Internal Rating</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <RatingPill
                      key={value}
                      value={value}
                      active={evaluation.rating === value}
                      onClick={() => handleEvaluationChange('rating', value)}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-slate-500" />
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Interview Management</p>
                </div>
                <div className="mt-4 grid gap-3">
                  <Input
                    label="Interview Date"
                    type="date"
                    value={evaluation.interviewDate}
                    onChange={(event) => handleEvaluationChange('interviewDate', event.target.value)}
                  />
                  <Input
                    label="Interview Time"
                    type="time"
                    value={evaluation.interviewTime}
                    onChange={(event) => handleEvaluationChange('interviewTime', event.target.value)}
                  />
                  <Input
                    label="Interviewer Name"
                    value={evaluation.interviewerName}
                    onChange={(event) => handleEvaluationChange('interviewerName', event.target.value)}
                    placeholder="Add interviewer name"
                  />
                  <label className="flex w-full flex-col">
                    <span className="field-label">Interview Type</span>
                    <select
                      value={evaluation.interviewType}
                      onChange={(event) => handleEvaluationChange('interviewType', event.target.value)}
                      className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                    >
                      <option value="online">Online</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Tags</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {workspace.tags.length ? (
                    workspace.tags.map((tag, index) => (
                      <Badge key={`${tag}-${index}`} tone="neutral">
                        {typeof tag === 'string' ? tag : tag.label || tag.name || String(tag)}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No tags available.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Save Evaluation</p>
                <Button type="button" variant="primary" className="mt-4 w-full" onClick={saveEvaluation} loading={savingEvaluation}>
                  Save Evaluation
                </Button>
                <div className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                  <p>Persisted locally until the decision workflow backend is available.</p>
                  <p>Last saved: {evaluation.savedAt ? formatDateTimeShort(evaluation.savedAt) : 'Not saved yet'}</p>
                  {evaluationMessage ? <p className="text-slate-700">{evaluationMessage}</p> : null}
                </div>
              </div>
            </div>
          </AdminCard>
        </aside>
      </div>

      {resumeFullscreenOpen && resumeUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6">
          <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.12)] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.28)]">
            <div className="flex items-center justify-between gap-4 border-b border-[rgba(15,23,42,0.08)] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resume Full Screen</p>
                <h3 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">{workspace.candidateName}</h3>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setResumeFullscreenOpen(false)} aria-label="Close preview">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <iframe title="Resume full screen preview" src={resumeUrl} className="h-full w-full bg-white" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
