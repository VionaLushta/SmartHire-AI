import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  BadgeCheck,
  CheckCircle2,
  CalendarDays,
  FileBarChart,
  FileDown,
  Eye,
  Github,
  GraduationCap,
  Globe,
  Layers3,
  Linkedin,
  Mail,
  MessageSquareText,
  MapPin,
  Phone,
  Code2,
  Send,
  Sparkles,
  Star,
  Target,
  Languages,
  Users,
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
import { applicationService } from '../../services/applicationService';
import { candidateService } from '../../services/candidateService';
import api from '../../services/api';
import { interviewService } from '../../services/interviewService';
import { unwrapResponse, unwrapItems, formatDateShort, formatDateTimeShort, formatMetricPercent, clampPercent, getInitials } from '../../utils/dashboard';

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

function displayValue(value, fallback = '—') {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!text || text === 'Not provided') return fallback;
  return text;
}

function displayDate(value, fallback = 'Awaiting update') {
  if (!value) return fallback;
  const formatted = formatDateShort(value);
  return formatted === 'Recently' ? fallback : formatted;
}

function formatAnalysisPercent(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '—';
  }

  return `${clampPercent(numeric)}%`;
}

function normalizeUrl(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text.startsWith('http://') || text.startsWith('https://') || text.startsWith('/') || text.startsWith('data:') || text.startsWith('blob:')) {
    return text;
  }
  return '';
}

function toBackendUrl(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || /^https?:\/\//i.test(text) || text.startsWith('data:') || text.startsWith('blob:')) return text;
  return `${String(api.defaults.baseURL || '').replace(/\/+$/, '')}/${text.replace(/^\/+/, '')}`;
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
  const resumes = asArray(candidate.resumes || analytics.resumes);
  const resumeSource = candidate.resume || analytics.resume || analytics.uploaded_resume || candidate.uploaded_resume || resumes[0] || {};
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
    location:
      candidate.location ||
      candidate.city ||
      candidate.state ||
      candidate.country ||
      analytics.location ||
      analytics.city ||
      analytics.country ||
      'Not provided',
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
    linkedin:
      candidate.linkedin ||
      candidate.linkedin_url ||
      analytics.linkedin ||
      analytics.linkedin_url ||
      '',
    github:
      candidate.github ||
      candidate.github_url ||
      analytics.github ||
      analytics.github_url ||
      '',
    portfolio:
      candidate.portfolio ||
      candidate.portfolio_url ||
      candidate.website ||
      analytics.portfolio ||
      analytics.portfolio_url ||
      candidate.website ||
      '',
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
    cultureFit: firstValue(
      analytics.culture_fit,
      analytics.metrics?.culture_fit,
      candidate.culture_fit,
      candidate.culture_fit_score,
    ),
    recruiterNotes: candidate.recruiter_notes || analytics.recruiter_notes || candidate.notes || '',
    requiredSkills: skillsRequired,
    tags,
    resume: {
      ...normalizeDocument(resumeSource, 0, 'resume'),
      previewUrl: resumePreviewUrl,
      text: resumeText,
    },
    application: analytics.application || candidate.application || {},
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
    <div className="relative pl-3 sm:pl-4">
      <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-200/90" />
      <div className="space-y-4">
      {events.map((event, index) => (
        <article key={event.id || `${event.title}-${index}`} className="relative rounded-[20px] bg-white p-4 pl-10 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg sm:p-5 sm:pl-12">
          <div className={`absolute left-3 top-6 h-3.5 w-3.5 rounded-full border-4 border-white ${event.tone === 'success' ? 'bg-emerald-500' : event.tone === 'warning' ? 'bg-amber-500' : event.tone === 'danger' ? 'bg-rose-500' : 'bg-slate-400'}`} />
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-semibold tracking-[-0.03em] text-slate-950">{event.title}</h4>
                <Badge tone={event.tone === 'success' ? 'success' : event.tone === 'warning' ? 'warning' : event.tone === 'danger' ? 'danger' : 'neutral'}>
                  {index + 1}
                </Badge>
              </div>
              {event.description ? <p className="text-sm leading-7 text-slate-600">{event.description}</p> : null}
            </div>
            <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
              {event.date ? formatDateTimeShort(event.date) : 'Not dated'}
            </span>
          </div>
        </article>
      ))}
      </div>
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
    interviewLocation: '',
    contactPhone: workspace.phone !== 'Not provided' ? workspace.phone : '',
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
    interviewLocation: savedEvaluation.interviewLocation || '',
    contactPhone: savedEvaluation.contactPhone || defaults.contactPhone,
    savedAt: savedEvaluation.savedAt || null,
  };
}

function buildEvaluationMetrics(workspace) {
  return [
    {
      label: 'Overall Match',
      value: workspace.overallMatchScore,
      hint: 'Aggregate fit signal from the analytics engine.',
      icon: Target,
      tone: 'primary',
    },
    {
      label: 'Resume Match',
      value: workspace.resumeSimilarity,
      hint: 'Similarity between the resume and the target role.',
      icon: FileBarChart,
      tone: 'slate',
    },
    {
      label: 'Skill Match',
      value: workspace.skillMatch,
      hint: 'Technical and functional skill alignment.',
      icon: Users,
      tone: 'emerald',
    },
    {
      label: 'Experience Match',
      value: workspace.experienceMatch,
      hint: 'Relevant depth of experience for the role.',
      icon: BarChart3,
      tone: 'blue',
    },
    {
      label: 'Education Match',
      value: workspace.educationMatch,
      hint: 'Education fit compared with the job criteria.',
      icon: GraduationCap,
      tone: 'indigo',
    },
    {
      label: 'Certificates Match',
      value: workspace.certificatesMatch,
      hint: 'Documented certifications and evidence.',
      icon: Sparkles,
      tone: 'amber',
    },
    {
      label: 'Language Match',
      value: workspace.languageMatch,
      hint: 'Language or communication fit when available.',
      icon: Globe,
      tone: 'violet',
    },
    {
      label: 'Culture Fit',
      value: workspace.cultureFit,
      hint: 'Signals for communication style and team alignment.',
      icon: Users,
      tone: 'rose',
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

function ScoreRing({ value, label, caption = 'AI match' }) {
  const percent = clampPercent(value);
  const hasValue = value !== null && value !== undefined && value !== '';
  const ringStyle = {
    background: `conic-gradient(#2563eb 0 ${hasValue ? percent : 0}%, #e2e8f0 ${hasValue ? percent : 0}% 100%)`,
  };

  return (
    <div className="mx-auto flex h-52 w-52 items-center justify-center rounded-full p-3" style={ringStyle}>
      <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{caption}</p>
        <p className="mt-2 text-5xl font-semibold tracking-[-0.06em] text-slate-950">{hasValue ? label : '—'}</p>
        {!hasValue ? <p className="mt-2 text-sm text-slate-500">No analysis available yet.</p> : null}
      </div>
    </div>
  );
}

function EvaluationKpiCard({ title, value, description, icon: Icon, tone = 'blue' }) {
  const percent = clampPercent(value);
  const hasValue = value !== null && value !== undefined && value !== '';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setReady(true);
      return undefined;
    }

    const raf = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const toneStyles = {
    blue: { shell: 'bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
    emerald: { shell: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
    amber: { shell: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
    indigo: { shell: 'bg-indigo-50 text-indigo-700', bar: 'bg-indigo-500' },
    violet: { shell: 'bg-violet-50 text-violet-700', bar: 'bg-violet-500' },
    rose: { shell: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
    slate: { shell: 'bg-slate-100 text-slate-700', bar: 'bg-slate-500' },
  };

  const currentTone = toneStyles[tone] || toneStyles.blue;

  return (
    <article className="group flex h-[220px] flex-col justify-between rounded-[20px] bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${currentTone.shell}`}>
          {Icon ? <Icon className="h-7 w-7" /> : null}
        </div>
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</span>
      </div>

      <div className="space-y-3">
        <p className="text-5xl font-semibold tracking-[-0.06em] text-slate-950">{hasValue ? formatAnalysisPercent(percent) : '—'}</p>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${currentTone.bar} transition-[width] duration-700 ease-out`}
            style={{ width: ready && hasValue ? `${percent}%` : '0%' }}
          />
        </div>
        <p className="text-base leading-7 text-slate-600">{hasValue ? description : 'No analysis available yet.'}</p>
      </div>
    </article>
  );
}

function EvaluationProgressRow({ label, value, tone = 'blue' }) {
  const percent = clampPercent(value);
  const hasValue = value !== null && value !== undefined && value !== '';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setReady(true);
      return undefined;
    }

    const raf = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, []);

  const toneStyles = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-500',
  };

  const barClass = toneStyles[tone] || toneStyles.blue;

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <p className="text-base font-medium text-slate-900">{label}</p>
        <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">{hasValue ? formatAnalysisPercent(percent) : 'No analysis available yet.'}</p>
      </div>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass} transition-[width] duration-700 ease-out`}
          style={{ width: ready && hasValue ? `${percent}%` : '0%' }}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone = 'slate' }) {
  const metricValue = formatScoreValue(value);
  const toneMap = {
    primary: 'bg-blue-50 text-blue-700 ring-blue-100',
    blue: 'bg-sky-50 text-sky-700 ring-sky-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    amber: 'bg-amber-50 text-amber-800 ring-amber-100',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-100',
  };
  const dotMap = {
    primary: 'bg-blue-500',
    blue: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-violet-500',
    rose: 'bg-rose-500',
    slate: 'bg-slate-400',
  };

  return (
    <div className="group rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[14px] ring-1 ${toneMap[tone] || toneMap.slate}`}>
            {Icon ? <Icon className="h-5 w-5" /> : null}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{metricValue}</p>
          </div>
        </div>
        <span className={`mt-1 h-2.5 w-2.5 rounded-full ${dotMap[tone] || dotMap.slate}`} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{hint}</p>
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
      className={`w-full rounded-[18px] border px-4 py-4 text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg ${toneClass}`}
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
  const [searchParams] = useSearchParams();
  const requestedApplicationId = searchParams.get('application_id');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [resumeFullscreenOpen, setResumeFullscreenOpen] = useState(false);
  const [evaluation, setEvaluation] = useState(() => buildDefaultEvaluation({}));
  const [evaluationMessage, setEvaluationMessage] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [savingAction, setSavingAction] = useState(false);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    initialLoadRef.current = true;

    async function loadCandidate() {
      const isInitialLoad = initialLoadRef.current;
      try {
        setError(null);
        if (isInitialLoad) setLoading(true);
        const [analyticsResult, profileResult, applicationsResult] = await Promise.allSettled([
          analyticsService.candidate(candidateId),
          candidateService.get(candidateId).catch(() => null),
          applicationService.list().catch(() => null),
        ]);
        const data = analyticsResult.status === 'fulfilled' ? unwrapResponse(analyticsResult.value) || {} : {};
        const profile = profileResult.status === 'fulfilled' ? unwrapResponse(profileResult.value) || {} : {};
        const applications = applicationsResult.status === 'fulfilled' ? unwrapItems(applicationsResult.value) : [];
        const candidateApplications = applications.filter((item) => String(item.user_id) === String(candidateId));
        const application = candidateApplications.find((item) => String(item.application_id) === String(requestedApplicationId))
          || candidateApplications.find((item) => ['pending', 'reviewed', 'interview'].includes(String(item.status || '').toLowerCase()))
          || candidateApplications[0]
          || {};
        if (!Object.keys(data).length && !Object.keys(profile).length && !Object.keys(application).length) {
          throw analyticsResult.reason || profileResult.reason || applicationsResult.reason || new Error('Candidate data unavailable.');
        }
        const profileResumes = asArray(profile.resumes);
        const selectedResume = profileResumes.find((resume) => String(resume.resume_id) === String(application.resume_id)) || profileResumes[0] || null;
        const resumeId = selectedResume?.resume_id || application.resume_id;
        const certificates = asArray(profile.certificates).map((certificate) => ({
          ...certificate,
          download_url: `/candidate/${candidateId}/certificate/${certificate.cert_id}/download`,
        }));
        const merged = {
          ...data,
          application,
          candidate: {
            ...(data.candidate || {}),
            ...profile,
            ...application,
            certificates,
            ...(selectedResume
              ? {
                  resume: {
                    ...selectedResume,
                    preview_url: `/candidate/${candidateId}/resume/${resumeId}/download`,
                    download_url: `/candidate/${candidateId}/resume/${resumeId}/download`,
                  },
                }
              : {}),
          },
          job: { ...(data.job || {}), title: application.job_title || data.job?.title, department_name: application.department_name || data.job?.department_name },
          missing_skills: application.missing_skills || data.missing_skills,
          strengths: application.strengths || data.strengths,
          ai_recommendation: application.ai_recommendation || data.ai_recommendation,
        };
        if (mounted) {
          setAnalytics(merged);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.detail || 'Unable to load candidate details.');
        }
      } finally {
        if (mounted) {
          if (isInitialLoad) setLoading(false);
          initialLoadRef.current = false;
        }
      }
    }

    if (candidateId) {
      loadCandidate();
    }
    const interval = candidateId ? window.setInterval(loadCandidate, 15000) : null;
    const onFocus = () => loadCandidate();
    if (candidateId) window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      if (interval) window.clearInterval(interval);
      if (candidateId) window.removeEventListener('focus', onFocus);
    };
  }, [candidateId, requestedApplicationId]);

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
  const resumeUrl = toBackendUrl(workspace.resume.previewUrl || workspace.resume.url);
  const resumeDownloadUrl = toBackendUrl(workspace.resume.url || workspace.resume.previewUrl);
  const certificateDownloadUrl = toBackendUrl(workspace.certificateDocuments.find((doc) => doc.url)?.url || '');
  const applicationDetails = workspace.application || {};
  const activeDecision = evaluation.decision || 'hold';
  const overallMatchValue = clampPercent(workspace.overallMatchScore);
  const candidateInitials = getInitials(workspace.candidate);
  const candidatePhoto = workspace.candidate.profile_picture_url || workspace.candidate.avatar_url || workspace.candidate.photo_url || '';
  const profileFields = [
    { label: 'Email', value: workspace.email, icon: Mail, href: workspace.email !== 'Not provided' ? `mailto:${workspace.email}` : '' },
    { label: 'Phone', value: workspace.phone, icon: Phone },
    { label: 'Location', value: workspace.location, icon: MapPin },
    { label: 'University', value: workspace.university, icon: GraduationCap },
    { label: 'Experience', value: workspace.yearsOfExperience, icon: BarChart3 },
    { label: 'LinkedIn', value: workspace.linkedin || 'Not provided', icon: Linkedin, href: workspace.linkedin ? workspace.linkedin : '' },
    { label: 'GitHub', value: workspace.github || 'Not provided', icon: Github, href: workspace.github ? workspace.github : '' },
    { label: 'Portfolio', value: workspace.portfolio || 'Not provided', icon: Globe, href: workspace.portfolio ? workspace.portfolio : '' },
  ];
  const timelineSteps = [
    {
      label: 'Applied',
      description: workspace.applicationDate ? formatPlainDate(workspace.applicationDate) : 'Submitted through the ATS.',
      active: Boolean(workspace.applicationDate),
    },
    {
      label: 'Resume Parsed',
      description: workspace.hasResume ? 'Resume document is available.' : 'No resume returned yet.',
      active: Boolean(workspace.hasResume),
    },
    {
      label: 'AI Evaluation',
      description: workspace.overallMatchScore !== null && workspace.overallMatchScore !== undefined ? `Match score ${formatMetricPercent(workspace.overallMatchScore)}.` : 'Waiting for analytics scoring.',
      active: workspace.overallMatchScore !== null && workspace.overallMatchScore !== undefined,
    },
    {
      label: 'Recruiter Review',
      description: workspace.recruiterAssigned !== 'Not provided' ? `Assigned to ${workspace.recruiterAssigned}.` : 'Pending recruiter assignment.',
      active: workspace.recruiterAssigned !== 'Not provided' || Boolean(workspace.recruiterNotes),
    },
    {
      label: 'Interview',
      description: workspace.interviewStage !== 'Not provided' ? workspace.interviewStage : 'No interview scheduled yet.',
      active: String(workspace.interviewStage || workspace.currentStatus || '').toLowerCase().includes('interview'),
    },
    {
      label: 'Offer',
      description: String(workspace.currentStatus || '').toLowerCase().includes('accept') ? 'Offer stage reached.' : 'Not reached yet.',
      active: String(workspace.currentStatus || '').toLowerCase().includes('accept'),
    },
  ];
  const documentItems = [
    {
      label: 'Resume',
      description: workspace.hasResume ? 'Primary resume document.' : 'No resume uploaded.',
      tone: workspace.hasResume ? 'success' : 'neutral',
      actionLabel: workspace.hasResume ? 'Open' : 'Unavailable',
      onClick: openResumeDownload,
      disabled: !resumeDownloadUrl,
    },
    {
      label: 'Certificates',
      description: workspace.certificateDocuments.length ? `${workspace.certificateDocuments.length} file(s) attached.` : 'No certificates uploaded.',
      tone: workspace.certificateDocuments.length ? 'primary' : 'neutral',
      actionLabel: workspace.certificateDocuments.length ? 'Open' : 'Unavailable',
      onClick: openCertificates,
      disabled: !certificateDownloadUrl,
    },
    {
      label: 'Cover Letter',
      description: textValue(workspace.candidate.cover_letter || workspace.candidate.coverLetter || workspace.coverLetter, 'No cover letter available.'),
      tone: 'warning',
      actionLabel: 'View',
      onClick: () => setActiveTab('overview'),
      disabled: false,
    },
  ];
  const aiKpiRows = [
    [
      {
        title: 'Overall Match',
        value: workspace.overallMatchScore,
        description: 'Strong alignment with the job requirements.',
        icon: Target,
        tone: 'blue',
      },
      {
        title: 'Resume Match',
        value: workspace.resumeSimilarity,
        description: 'The resume maps well to the target role.',
        icon: FileBarChart,
        tone: 'indigo',
      },
      {
        title: 'Technical Skills',
        value: workspace.skillMatch,
        description: 'Core technical capabilities look solid.',
        icon: Code2,
        tone: 'emerald',
      },
      {
        title: 'Experience',
        value: workspace.experienceMatch,
        description: 'Relevant background is aligned to the role.',
        icon: BarChart3,
        tone: 'amber',
      },
    ],
    [
      {
        title: 'Education',
        value: workspace.educationMatch,
        description: 'Academic background supports the role.',
        icon: GraduationCap,
        tone: 'violet',
      },
      {
        title: 'Certificates',
        value: workspace.certificatesMatch,
        description: 'Credential coverage is in a good range.',
        icon: BadgeCheck,
        tone: 'blue',
      },
      {
        title: 'Languages',
        value: workspace.languageMatch,
        description: 'Communication signals are favorable.',
        icon: Languages,
        tone: 'emerald',
      },
      {
        title: 'Culture Fit',
        value: workspace.cultureFit,
        description: 'Signals suggest a strong team fit.',
        icon: Users,
        tone: 'rose',
      },
    ],
  ];
  const aiStrengths = asArray(workspace.strengths).slice(0, 3);
  const aiMissing = asArray(workspace.weaknesses).slice(0, 3);
  const aiDetectedSkills = skillGroups.detected;
  const hasConfidence = workspace.confidenceScore !== null && workspace.confidenceScore !== undefined && workspace.confidenceScore !== '';
  const aiConfidence = hasConfidence ? Number(workspace.confidenceScore) : null;
  const aiConfidenceLabel = !hasConfidence || Number.isNaN(aiConfidence)
    ? 'Low'
    : aiConfidence >= 75
      ? 'High'
      : aiConfidence >= 50
        ? 'Medium'
        : 'Low';
  const aiConfidenceTone = !hasConfidence || Number.isNaN(aiConfidence)
    ? 'neutral'
    : aiConfidence >= 75
      ? 'success'
      : aiConfidence >= 50
        ? 'warning'
        : 'danger';
  const aiRecommendation = workspace.aiRecommendation && workspace.aiRecommendation !== 'No AI recommendation available.'
    ? workspace.aiRecommendation
    : 'No analysis available yet.';
  const aiRecommendationSentence = workspace.reasoningSummary || 'Proceed to the next review step.';
  const applicationInfo = [
    { label: 'Application Date', value: formatPlainDate(workspace.applicationDate) },
    { label: 'Recruiter Assigned', value: textValue(workspace.recruiterAssigned) },
    { label: 'Years of Experience', value: textValue(workspace.yearsOfExperience) },
    { label: 'University', value: textValue(workspace.university) },
    { label: 'Degree', value: textValue(workspace.degree) },
    { label: 'Interview Stage', value: textValue(workspace.interviewStage) },
  ];

  function handleEvaluationChange(key, value) {
    setEvaluation((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function openResumeDownload() {
    if (!resumeDownloadUrl) {
      setActiveTab('resume');
      return;
    }
    window.open(resumeDownloadUrl, '_blank', 'noopener,noreferrer');
  }

  function openCertificates() {
    if (!certificateDownloadUrl) {
      setActiveTab('certificates');
      return;
    }
    window.open(certificateDownloadUrl, '_blank', 'noopener,noreferrer');
  }

  async function shareCandidateProfile() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = `${workspace.candidateName} · Candidate Detail`;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url,
        });
        return;
      }

      if (navigator.clipboard?.writeText && url) {
        await navigator.clipboard.writeText(url);
        setEvaluationMessage('Candidate link copied to clipboard.');
      }
    } catch {
      // Silent no-op for share failures in the browser.
    }
  }

  function scrollToEvaluation() {
    document.getElementById('ai-evaluation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
      interviewLocation: evaluation.interviewLocation,
      contactPhone: evaluation.contactPhone,
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

  async function updateApplicationStatus(status) {
    if (!applicationDetails.application_id) {
      setEvaluationMessage('This candidate does not have an application ID.');
      return;
    }
    if (status === 'accepted') {
      const requiredInterviewFields = [
        ['interviewDate', 'interview date'],
        ['interviewTime', 'interview time'],
        ['interviewerName', 'interviewer name'],
        ['contactPhone', 'contact phone'],
        ['interviewLocation', 'location or meeting link'],
      ];
      const missingFields = requiredInterviewFields
        .filter(([key]) => !String(evaluation[key] || '').trim())
        .map(([, label]) => label);
      if (missingFields.length) {
        setEvaluationMessage(`Complete these fields before accepting: ${missingFields.join(', ')}.`);
        return;
      }
    }
    try {
      setSavingAction(true);
      await applicationService.updateStatus(applicationDetails.application_id, status);
      setEvaluation((current) => ({ ...current, decision: status === 'accepted' ? 'accept' : 'reject' }));
      setEvaluationMessage(`Application marked as ${status}. Status email sent to ${workspace.email}.`);
    } catch (err) {
      setEvaluationMessage(err?.response?.data?.detail || 'Unable to update the application status.');
    } finally {
      setSavingAction(false);
    }
  }

  async function scheduleInterview() {
    if (!applicationDetails.job_id || !evaluation.interviewDate || !evaluation.interviewTime || !evaluation.interviewerName) {
      setEvaluationMessage('Enter the interview date, time, and interviewer name first.');
      return;
    }
    try {
      setSavingAction(true);
      const response = await interviewService.schedule({
        candidate_id: candidateId,
        job_id: applicationDetails.job_id,
        interview_date: evaluation.interviewDate,
        interview_time: evaluation.interviewTime,
        duration_minutes: 60,
        interview_type: evaluation.interviewType === 'online' ? 'Online' : 'On-site',
        interviewer_name: evaluation.interviewerName,
        location: evaluation.interviewLocation || null,
        contact_phone: evaluation.contactPhone || null,
        notes: evaluation.notes || null,
      });
      const interview = unwrapResponse(response) || {};
      setEvaluation((current) => ({ ...current, decision: 'interview', savedAt: new Date().toISOString() }));
      setEvaluationMessage(`Interview scheduled. Invitation email ${interview.email_status === 'sent' ? 'sent' : 'created for delivery'} to ${workspace.email}.`);
    } catch (err) {
      setEvaluationMessage(err?.response?.data?.detail || 'Unable to schedule the interview.');
    } finally {
      setSavingAction(false);
    }
  }

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

  function downloadCandidateData() {
    const escapeHtml = (value) => String(value ?? 'Not provided')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    const formatValue = (value) => {
      if (Array.isArray(value)) {
        return value.map((item) => typeof item === 'object' ? item.label || item.name || JSON.stringify(item) : item).join(', ') || 'Not provided';
      }
      return value || 'Not provided';
    };
    const row = (label, value) => `<tr><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(formatValue(value))}</td></tr>`;
    const section = (title, content) => `<section class="section"><h2>${escapeHtml(title)}</h2>${content}</section>`;
    const status = applicationDetails.status || workspace.currentStatus || 'Under review';
    const decision = evaluation.decision === 'accept'
      ? 'Accepted'
      : evaluation.decision === 'reject'
        ? 'Rejected'
        : evaluation.decision === 'interview'
          ? 'Interview scheduled'
          : status;
    const html = `<!doctype html>
      <html><head><meta charset="utf-8"><title>${escapeHtml(workspace.candidateName)} - Candidate Report</title>
      <style>
        @page{margin:.55in}body{font-family:Arial,Helvetica,sans-serif;color:#172033;margin:0;background:#f3f6fb}body>div{background:#fff;padding:34px 42px}.topbar{border-bottom:1px solid #dbe5f2;padding-bottom:15px}.brand{font-size:11px;font-weight:bold;letter-spacing:3px;color:#2563eb;text-transform:uppercase}.subtitle{font-size:11px;color:#71819a;margin-top:5px}.hero{background:#0b1740;color:#fff;padding:25px 28px;margin:20px 0 24px;border-radius:14px}.hero h1{font-size:29px;margin:0 0 6px}.hero p{color:#dbeafe;margin:0;font-size:13px}.meta{margin-top:18px;font-size:11px;color:#b9cdf5}.status{display:inline-block;background:#dbeafe;color:#123b8e;border-radius:20px;padding:6px 12px;margin-top:14px;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px}.section{margin:24px 0}.section h2{font-size:15px;color:#102a72;font-weight:bold;letter-spacing:.4px;border-bottom:2px solid #2563eb;padding:0 0 8px;margin:0}.card{background:#f8fbff;border:1px solid #dbe7f5;padding:5px;margin-top:10px;border-radius:10px}.card p{margin:10px 12px;line-height:1.6}.two-col{width:100%;border-collapse:separate;border-spacing:8px 0;margin:5px -8px 0;width:calc(100% + 16px)}.two-col td{width:50%;vertical-align:top;border:0;padding:0}.two-col .card{margin-top:0}table{border-collapse:collapse;width:100%;margin-top:0}td{border-bottom:1px solid #e3ebf5;padding:10px 12px;vertical-align:top;font-size:12px;line-height:1.45}.label{width:29%;font-weight:bold;color:#526581;background:#eef5ff}.value{color:#172033}.highlight{background:#eefbf4;border:1px solid #b7ebce;color:#166534;padding:13px 15px;border-radius:10px;font-size:13px;font-weight:bold}.muted{color:#667892;font-size:12px;line-height:1.6}.footer{border-top:1px solid #dbe7f5;padding-top:15px;margin-top:30px;color:#70819b;font-size:10px}.confidential{float:right;color:#9aabc0}
      </style></head><body><div>
      <div class="topbar"><div class="brand">SmartHire AI</div><div class="subtitle">Candidate review report | Generated for recruitment use</div></div>
      <div class="hero"><h1>${escapeHtml(workspace.candidateName)}</h1><p>${escapeHtml(applicationDetails.job_title || workspace.appliedPosition || 'Candidate application')}</p><div class="status">${escapeHtml(decision)}</div><div class="meta">Application #${escapeHtml(applicationDetails.application_id || 'Not provided')} | Applied ${escapeHtml(formatPlainDate(applicationDetails.created_at || workspace.applicationDate))}</div></div>
      ${section('Candidate information', `<div class="card"><table>${row('Email', workspace.email)}${row('Phone', workspace.phone)}${row('Location', workspace.location)}${row('Date of birth', workspace.candidate.date_of_birth)}${row('University', workspace.university)}${row('Experience', workspace.yearsOfExperience)}</table></div>`)}
      ${section('Professional links', `<div class="card"><table>${row('LinkedIn', workspace.linkedin)}${row('GitHub', workspace.github)}${row('Portfolio', workspace.portfolio)}${row('Professional summary', workspace.professionalSummary)}</table></div>`)}
      ${section('Application details', `<div class="card"><table>${row('Position', applicationDetails.job_title || workspace.appliedPosition)}${row('Company', applicationDetails.company_name)}${row('Department', applicationDetails.department_name)}${row('Status', status)}${row('Applied date', applicationDetails.created_at || workspace.applicationDate)}${row('Cover letter', applicationDetails.cover_letter ? 'Attached' : 'Not attached')}</table></div>`)}
      ${evaluation.interviewDate || evaluation.interviewTime || evaluation.interviewerName ? section('Interview details', `<div class="highlight">${escapeHtml(decision)}</div><div class="card"><table>${row('Date', evaluation.interviewDate)}${row('Time', evaluation.interviewTime)}${row('Interviewer', evaluation.interviewerName)}${row('Type', evaluation.interviewType === 'online' ? 'Online' : 'On-site')}${row('Location / meeting link', evaluation.interviewLocation)}${row('Contact phone', evaluation.contactPhone)}</table></div>`) : ''}
      ${section('AI review', `<div class="card"><table>${row('AI match', workspace.overallMatchScore)}${row('Recommendation', workspace.aiRecommendation)}${row('Strong skills', workspace.strengths)}${row('Skills to improve', workspace.missingSkills)}</table></div>`)}
      ${section('Documents', `<div class="card"><table>${row('CV / Resume', workspace.resume.title)}${row('Certificates', workspace.certificateDocuments.map((document) => document.title))}${row('Cover letter', applicationDetails.cover_letter ? 'Attached to application' : 'Not attached')}</table></div>`)}
      ${applicationDetails.cover_letter ? section('Cover letter', `<div class="card"><p class="muted">${escapeHtml(applicationDetails.cover_letter)}</p></div>`) : ''}
      <div class="footer">SmartHire AI <span class="confidential">Confidential candidate information</span></div></div></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${workspace.candidateName.replace(/\s+/g, '-').toLowerCase()}-candidate-data.doc`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadProtectedFile(url, fallbackName) {
    if (!url) return;
    try {
      const response = await api.get(url, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fallbackName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to download this document.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-10">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button as={Link} to="/admin/candidates" variant="secondary" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to candidates
          </Button>
          <div className="flex flex-wrap gap-2">
            {resumeDownloadUrl ? (
              <Button type="button" onClick={() => downloadProtectedFile(resumeDownloadUrl, workspace.resume.title || 'resume.pdf')} variant="primary">
                <FileDown className="h-4 w-4" />
                Download CV
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={downloadCandidateData}>
              <FileDown className="h-4 w-4" />
              Save candidate data
            </Button>
          </div>
        </div>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar initials={candidateInitials} size="lg" className="h-16 w-16 text-xl" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Candidate application</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{workspace.candidateName}</h1>
                <p className="mt-1 text-sm text-slate-500">{displayValue(workspace.appliedPosition, 'Position not provided')}</p>
              </div>
            </div>
            <StatusBadge status={workspace.currentStatus} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Email', workspace.email],
              ['Phone', workspace.phone],
              ['Location', workspace.location],
              ['Date of birth', displayDate(workspace.candidate.date_of_birth, 'Not provided')],
              ['Applied date', formatPlainDate(applicationDetails.created_at || workspace.applicationDate)],
              ['Application ID', applicationDetails.application_id ? `#${applicationDetails.application_id}` : 'Not provided'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 break-words text-sm font-medium text-slate-900">{displayValue(value, 'Not provided')}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <AdminCard title="Application" description="The information submitted for this position.">
            <div className="space-y-3 text-sm">
              <p><span className="font-semibold text-slate-900">Company:</span> {displayValue(applicationDetails.company_name)}</p>
              <p><span className="font-semibold text-slate-900">Position:</span> {displayValue(applicationDetails.job_title || workspace.appliedPosition)}</p>
              <p><span className="font-semibold text-slate-900">Department:</span> {displayValue(applicationDetails.department_name)}</p>
              <p><span className="font-semibold text-slate-900">Cover letter:</span> {applicationDetails.cover_letter ? 'Attached' : 'Not attached'}</p>
              {applicationDetails.cover_letter ? <p className="rounded-2xl bg-slate-50 p-4 leading-6 text-slate-600">{applicationDetails.cover_letter}</p> : null}
            </div>
          </AdminCard>

          <AdminCard title="Documents" description="Files submitted by this candidate.">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-blue-50 p-4">
                <div><p className="text-sm font-semibold text-slate-900">{workspace.resume.title}</p><p className="mt-1 text-xs text-slate-500">CV / Resume</p></div>
                {resumeDownloadUrl ? <Button type="button" onClick={() => downloadProtectedFile(resumeDownloadUrl, workspace.resume.title || 'resume.pdf')} variant="primary" size="sm">Download</Button> : <span className="text-sm text-slate-500">Not attached</span>}
              </div>
              {workspace.certificateDocuments.length ? workspace.certificateDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
                  <div><p className="text-sm font-semibold text-slate-900">{document.title}</p><p className="mt-1 text-xs text-slate-500">Certificate</p></div>
                  {document.url ? <Button type="button" onClick={() => downloadProtectedFile(toBackendUrl(document.url), document.title || 'certificate')} variant="secondary" size="sm">Download</Button> : null}
                </div>
              )) : <p className="text-sm text-slate-500">No certificates attached.</p>}
            </div>
          </AdminCard>

          <AdminCard title="Decision and interview" description="Choose a result or schedule an interview. The candidate receives an email automatically.">
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="primary" loading={savingAction} onClick={() => updateApplicationStatus('accepted')}>
                  Accept application
                </Button>
                <Button type="button" variant="secondary" loading={savingAction} onClick={() => updateApplicationStatus('rejected')}>
                  Reject application
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Interview date" type="date" value={evaluation.interviewDate} onChange={(event) => handleEvaluationChange('interviewDate', event.target.value)} />
                <Input
                  label="Interview time"
                  type="time"
                  step="900"
                  value={evaluation.interviewTime}
                  onChange={(event) => handleEvaluationChange('interviewTime', event.target.value)}
                  onClick={(event) => event.currentTarget.showPicker?.()}
                />
                <Input label="Interviewer name" value={evaluation.interviewerName} onChange={(event) => handleEvaluationChange('interviewerName', event.target.value)} placeholder="Name of interviewer" />
                <Input label="Contact phone" value={evaluation.contactPhone} onChange={(event) => handleEvaluationChange('contactPhone', event.target.value)} placeholder="Phone number" />
                <label className="flex w-full flex-col">
                  <span className="field-label">Interview type</span>
                  <select value={evaluation.interviewType} onChange={(event) => handleEvaluationChange('interviewType', event.target.value)} className="h-11 rounded-[14px] border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10">
                    <option value="online">Online</option>
                    <option value="onsite">On-site</option>
                  </select>
                </label>
                <Input label="Location / meeting link" value={evaluation.interviewLocation} onChange={(event) => handleEvaluationChange('interviewLocation', event.target.value)} placeholder="Office address or online link" />
              </div>

              <Button type="button" variant="primary" loading={savingAction} onClick={scheduleInterview}>
                <CalendarDays className="h-4 w-4" />
                Schedule interview and send email
              </Button>
              {evaluationMessage ? <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{evaluationMessage}</p> : null}
            </div>
          </AdminCard>

          <AdminCard title="Profile information" description="Professional details saved by the candidate.">
            <div className="space-y-4 text-sm">
              <p className="leading-6 text-slate-700">{displayValue(workspace.professionalSummary, 'No profile summary provided.')}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-900">LinkedIn:</span> {displayValue(workspace.linkedin)}</p>
                <p><span className="font-semibold text-slate-900">GitHub:</span> {displayValue(workspace.github)}</p>
                <p><span className="font-semibold text-slate-900">Portfolio:</span> {displayValue(workspace.portfolio)}</p>
                <p><span className="font-semibold text-slate-900">Experience:</span> {displayValue(workspace.yearsOfExperience)}</p>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="AI summary" description="The main analysis signals for this application.">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4"><span className="text-sm font-semibold text-slate-700">AI match</span><span className="text-2xl font-bold text-emerald-700">{formatScoreValue(workspace.overallMatchScore)}</span></div>
              <p className="text-sm leading-6 text-slate-700">{displayValue(workspace.aiRecommendation, 'No AI recommendation available.')}</p>
              <p className="text-sm"><span className="font-semibold text-slate-900">Strong skills:</span> {workspace.strengths.length ? workspace.strengths.join(', ') : 'Not available'}</p>
              <p className="text-sm"><span className="font-semibold text-slate-900">Missing skills:</span> {workspace.missingSkills.length ? workspace.missingSkills.join(', ') : 'Not available'}</p>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/70 pb-10">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button as={Link} to="/admin/candidates" variant="secondary" size="sm" className="h-10 rounded-[14px] px-4">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Badge tone="primary">Candidate Detail</Badge>
                  <Badge tone="success">{formatMetricPercent(overallMatchValue)} AI Match</Badge>
                </div>

                <div className="flex items-start gap-4 sm:items-center">
                  {candidatePhoto ? (
                    <img
                      src={candidatePhoto}
                      alt={workspace.candidateName}
                      className="h-20 w-20 rounded-full object-cover shadow-[0_12px_24px_rgba(15,23,42,0.12)] ring-2 ring-white"
                    />
                  ) : (
                    <Avatar initials={candidateInitials} size="lg" className="h-20 w-20 text-2xl" />
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="truncate text-4xl font-semibold tracking-[-0.06em] text-slate-950">{workspace.candidateName}</h1>
                      <StatusBadge status={workspace.currentStatus} />
                    </div>
                    <p className="mt-2 text-lg text-slate-600">{displayValue(workspace.appliedPosition, 'Applied position will appear here')}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {resumeDownloadUrl ? (
                  <Button as="a" href={resumeDownloadUrl} target="_blank" rel="noreferrer" variant="secondary">
                    <FileDown className="h-4 w-4" />
                    Download Resume
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" disabled>
                    <FileDown className="h-4 w-4" />
                    Download Resume
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={shareCandidateProfile}>
                  <Send className="h-4 w-4" />
                  Share
                </Button>
                <Button type="button" variant="secondary" onClick={scrollToEvaluation}>
                  <Sparkles className="h-4 w-4" />
                  Re-analyze
                </Button>
                <Button as={Link} to="/admin/candidates" variant="primary">
                  Back
                </Button>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <AdminCard title="Candidate Overview" description="The candidate’s profile snapshot and contact context.">
              <div className="space-y-6">
                <p className="text-base leading-7 text-slate-600">
                  {displayValue(
                    workspace.professionalSummary,
                    'A concise profile summary will appear once the backend returns parsed candidate context.',
                  )}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {profileFields.map((field) => {
                    const Icon = field.icon;
                    const value = displayValue(field.value, 'Unavailable');
                    const content = (
                      <div className="rounded-2xl bg-slate-50 p-4 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg">
                        <div className="flex items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{field.label}</p>
                            <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
                          </div>
                        </div>
                      </div>
                    );

                    return field.href && field.value ? (
                      <a key={field.label} href={field.href} target="_blank" rel="noreferrer">
                        {content}
                      </a>
                    ) : (
                      <div key={field.label}>{content}</div>
                    );
                  })}
                </div>
              </div>
            </AdminCard>

            <AdminCard title="Overall AI Match" description="A quick, visual read on candidate fit.">
              <div className="space-y-6">
                <ScoreRing value={workspace.overallMatchScore} label={formatMetricPercent(overallMatchValue)} caption="AI Match" />

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Resume', value: workspace.resumeSimilarity, tone: 'blue' },
                    { label: 'Skill', value: workspace.skillMatch, tone: 'emerald' },
                    { label: 'Experience', value: workspace.experienceMatch, tone: 'amber' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-slate-50 p-4 text-center shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">{formatScoreValue(item.value)}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Match Note</p>
                  <p className="mt-2 text-base leading-7 text-slate-700">
                    {displayValue(workspace.reasoningSummary, 'A short rationale will appear here when the analytics payload is available.')}
                  </p>
                </div>
              </div>
            </AdminCard>

            <AdminCard title="Recruiter Actions" description="Decision buttons for the current candidate.">
              <div className="space-y-4">
                <DecisionButton
                  label="Accept"
                  description="Advance the candidate toward an offer."
                  tone="success"
                  active={activeDecision === 'accept'}
                  onClick={() => handleEvaluationChange('decision', 'accept')}
                />
                <DecisionButton
                  label="Interview"
                  description="Move the candidate to the interview stage."
                  tone="warning"
                  active={activeDecision === 'interview'}
                  onClick={() => handleEvaluationChange('decision', 'interview')}
                />
                <DecisionButton
                  label="Hold"
                  description="Keep the application in review."
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

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Current Decision</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{buildDecisionLabel(activeDecision)}</p>
                </div>
              </div>
            </AdminCard>
          </div>

          <AdminCard title="Application Details" description="Everything submitted for this specific job application.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Position', value: applicationDetails.job_title || workspace.appliedPosition },
                { label: 'Company', value: applicationDetails.company_name },
                { label: 'Status', value: applicationDetails.status || workspace.currentStatus },
                { label: 'Applied date', value: formatPlainDate(applicationDetails.created_at || workspace.applicationDate) },
                { label: 'Application ID', value: applicationDetails.application_id ? `#${applicationDetails.application_id}` : null },
                { label: 'Resume', value: workspace.hasResume ? workspace.resume.title : 'Not attached' },
                { label: 'Cover letter', value: applicationDetails.cover_letter ? 'Attached' : 'Not attached' },
                { label: 'AI recommendation', value: applicationDetails.ai_recommendation || workspace.aiRecommendation },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                  <p className="mt-2 break-words text-sm font-medium leading-6 text-slate-900">{displayValue(item.value, 'Not provided')}</p>
                </div>
              ))}
            </div>
          </AdminCard>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminCard
              id="ai-evaluation"
              title="AI Evaluation"
              description="One premium analytics card with a circular score, progress bars, and a clear recommendation."
              action={(
                <Button type="button" variant="primary" onClick={saveEvaluation} loading={savingEvaluation}>
                  Save Evaluation
                </Button>
              )}
            >
              <div className="space-y-6">
                <div className="rounded-[20px] bg-slate-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col items-center gap-5 text-center lg:flex-row lg:text-left">
                      <ScoreRing value={workspace.overallMatchScore} label={formatMetricPercent(overallMatchValue)} caption="Overall Match" />
                      <div className="space-y-3">
                        <Badge tone={aiConfidenceTone} className="px-3 py-1.5 text-[11px]">
                          {aiConfidenceLabel} Match
                        </Badge>
                        <p className="max-w-xl text-xl leading-8 text-slate-800">
                          {displayValue(aiRecommendation, 'No analysis available yet.')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <EvaluationProgressRow label="Resume Match" value={workspace.resumeSimilarity} tone="blue" />
                  <EvaluationProgressRow label="Technical Skills" value={workspace.skillMatch} tone="emerald" />
                  <EvaluationProgressRow label="Experience" value={workspace.experienceMatch} tone="amber" />
                  <EvaluationProgressRow label="Education" value={workspace.educationMatch} tone="indigo" />
                  <EvaluationProgressRow label="Certificates" value={workspace.certificatesMatch} tone="violet" />
                  <EvaluationProgressRow label="Languages" value={workspace.languageMatch} tone="rose" />
                  <EvaluationProgressRow label="Culture Fit" value={workspace.cultureFit} tone="slate" />
                </div>

                <div className="rounded-[20px] bg-slate-50 p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">AI Recommendation</p>
                      </div>
                      <p className="mt-3 text-base leading-8 text-slate-700">
                        {displayValue(aiRecommendationSentence, 'Proceed to Technical Interview.')}
                      </p>
                    </div>
                    <Badge tone={aiConfidenceTone} className="px-3 py-1.5 text-[11px]">
                      Confidence {aiConfidenceLabel}
                    </Badge>
                  </div>

                  <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Strengths</p>
                      <ul className="mt-3 space-y-2 text-base leading-7 text-slate-700">
                        {aiStrengths.length ? (
                          aiStrengths.map((item, index) => (
                            <li key={`ai-strength-${index}`} className="flex items-start gap-2">
                              <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-600" />
                              <span>{typeof item === 'string' ? item : item.label || item.name || String(item)}</span>
                            </li>
                          ))
                        ) : (
                          <li>No analysis available yet.</li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">Missing Skills</p>
                      <ul className="mt-3 space-y-2 text-base leading-7 text-slate-700">
                        {aiMissing.length ? (
                          aiMissing.map((item, index) => (
                            <li key={`ai-missing-${index}`} className="flex items-start gap-2">
                              <Layers3 className="mt-1 h-4 w-4 text-amber-600" />
                              <span>{typeof item === 'string' ? item : item.label || item.name || String(item)}</span>
                            </li>
                          ))
                        ) : (
                          <li>No analysis available yet.</li>
                        )}
                      </ul>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900">Recommendation</p>
                      <p className="mt-3 text-base leading-7 text-slate-700">
                        {displayValue(aiRecommendationSentence, 'Proceed to Technical Interview.')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </AdminCard>

            <AdminCard title="Recruiter Notes" description="Private notes, interview status, and saved evaluation context.">
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-900">Notes</label>
                  <textarea
                    value={evaluation.notes}
                    onChange={(event) => handleEvaluationChange('notes', event.target.value)}
                    rows={12}
                    placeholder="Add recruiter observations, interview prep, or follow-up reminders."
                    className="mt-3 w-full resize-none rounded-2xl border-0 bg-slate-50 p-4 text-base leading-7 text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:shadow-lg focus:ring-2 focus:ring-blue-500/15"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Interview Stage</p>
                    <p className="mt-2 text-base font-medium text-slate-900">{displayValue(workspace.interviewStage, 'Awaiting interview')}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Assigned Recruiter</p>
                    <p className="mt-2 text-base font-medium text-slate-900">{displayValue(workspace.recruiterAssigned, 'Unassigned')}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Interview Details</p>
                  </div>
                  <div className="mt-4 grid gap-4">
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
                      placeholder="Interview owner"
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

                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Save Status</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button type="button" variant="primary" onClick={saveEvaluation} loading={savingEvaluation}>
                      Save Evaluation
                    </Button>
                    <Badge tone="neutral">Last saved {evaluation.savedAt ? formatDateTimeShort(evaluation.savedAt) : 'not yet'}</Badge>
                  </div>
                  {evaluationMessage ? <p className="mt-3 text-sm leading-6 text-slate-600">{evaluationMessage}</p> : null}
                </div>
              </div>
            </AdminCard>
          </div>

          <AdminCard title="Timeline" description="A vertical view of the candidate journey.">
            <Timeline events={historyEvents} />
          </AdminCard>

          <AdminCard title="Documents" description="Resume, certificates, and cover letter in one organized workspace.">
            <div className="rounded-2xl bg-slate-50 p-5 sm:p-6">
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Resume</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Primary document</h4>
                    </div>
                    <FileDown className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {workspace.hasResume ? 'The candidate resume is available for review.' : 'A resume will appear here when uploaded.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" onClick={() => setResumeFullscreenOpen(true)} disabled={!resumeUrl}>
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {resumeDownloadUrl ? (
                      <Button as="a" href={resumeDownloadUrl} target="_blank" rel="noreferrer" variant="primary" download>
                        <FileDown className="h-4 w-4" />
                        Download
                      </Button>
                    ) : (
                      <Button type="button" variant="primary" disabled>
                        <FileDown className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Certificates</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Supporting files</h4>
                    </div>
                    <FileBarChart className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {workspace.certificateDocuments.length
                      ? `${workspace.certificateDocuments.length} certificate file(s) are attached.`
                      : 'Supporting certificates will be shown here when available.'}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" onClick={openCertificates} disabled={!certificateDownloadUrl}>
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    {certificateDownloadUrl ? (
                      <Button as="a" href={certificateDownloadUrl} target="_blank" rel="noreferrer" variant="primary" download>
                        <FileDown className="h-4 w-4" />
                        Download
                      </Button>
                    ) : (
                      <Button type="button" variant="primary" disabled>
                        <FileDown className="h-4 w-4" />
                        Download
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Cover Letter</p>
                      <h4 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Candidate narrative</h4>
                    </div>
                    <Target className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-4 text-base leading-7 text-slate-600">
                    {displayValue(
                      workspace.candidate.cover_letter || workspace.candidate.coverLetter || workspace.coverLetter,
                      'A cover letter preview will appear here if one was submitted.',
                    )}
                  </p>
                  <div className="mt-5">
                    <Button type="button" variant="secondary" className="w-full" disabled>
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
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
