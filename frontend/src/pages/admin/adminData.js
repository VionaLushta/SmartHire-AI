import { clampPercent, formatDateShort, formatMetricPercent } from '../../utils/dashboard';

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstArray(...values) {
  for (const value of values) {
    if (Array.isArray(value) && value.length) {
      return value;
    }
  }
  return [];
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (!Number.isNaN(number)) {
      return number;
    }
  }
  return 0;
}

function pickLabel(item, fallback) {
  return (
    item?.label ||
    item?.name ||
    item?.title ||
    item?.position ||
    item?.job_title ||
    item?.candidate_name ||
    fallback
  );
}

function pickCount(item) {
  return firstNumber(item?.value, item?.count, item?.applications, item?.total, item?.score);
}

function findByNames(source = [], names = []) {
  return source.find((item) => {
    const label = String(item?.label || item?.name || item?.status || '').toLowerCase();
    return names.some((name) => label.includes(name));
  });
}

export function buildAdminKpis(analytics = {}) {
  const metrics = analytics.metrics || {};
  const funnel = asArray(analytics.funnel || analytics.charts?.pie_chart_hiring_funnel);

  const accepted = firstNumber(
    metrics.accepted_applications,
    metrics.total_accepted,
    findByNames(funnel, ['accepted', 'hired', 'offer'])?.value,
  );
  const rejected = firstNumber(
    metrics.rejected_applications,
    metrics.total_rejected,
    findByNames(funnel, ['rejected'])?.value,
  );
  const underReview = firstNumber(
    metrics.under_review_applications,
    metrics.reviewing_applications,
    findByNames(funnel, ['under review', 'review', 'pending'])?.value,
  );
  const alternativeRole = firstNumber(
    metrics.alternative_role_applications,
    findByNames(funnel, ['alternative role', 'alternate role'])?.value,
  );
  const interviewInvitations = firstNumber(
    metrics.interview_invitations,
    metrics.total_interview_invitations,
    metrics.total_interviews,
    findByNames(funnel, ['interview'])?.value,
  );

  return [
    {
      label: 'Total Applications',
      value: firstNumber(metrics.total_applications),
      hint: 'All submitted applications',
    },
    {
      label: 'Accepted',
      value: accepted,
      hint: 'Moved to hire',
    },
    {
      label: 'Rejected',
      value: rejected,
      hint: 'Closed from review',
    },
    {
      label: 'Under Review',
      value: underReview,
      hint: 'Still in the pipeline',
    },
    {
      label: 'Alternative Role',
      value: alternativeRole,
      hint: 'Re-routed to another opening',
    },
    {
      label: 'Average Match Score',
      value: formatMetricPercent(metrics.average_ai_match_score ?? metrics.average_match_score),
      hint: 'Platform-wide fit signal',
    },
    {
      label: 'Open Positions',
      value: firstNumber(metrics.total_jobs, metrics.open_positions),
      hint: 'Live active jobs',
    },
    {
      label: 'Interview Invitations',
      value: interviewInvitations,
      hint: 'Outreach or scheduled invites',
    },
  ];
}

export function buildApplicationsByPosition(analytics = {}) {
  const source = firstArray(
    analytics.charts?.bar_chart_applications_by_position,
    analytics.charts?.bar_chart_applications_by_job,
    analytics.applications_by_position,
    analytics.position_breakdown,
  );

  return source.map((item, index) => ({
    label: pickLabel(item, `Position ${index + 1}`),
    value: pickCount(item),
  })).filter((item) => item.label);
}

export function buildCandidateRows(analytics = {}) {
  const rows = asArray(analytics.top_candidates || analytics.candidates).map((candidate, index) => ({
    candidate_id: String(candidate.candidate_id || candidate.user_id || candidate.id || candidate.application_id || index + 1),
    application_id: candidate.application_id || candidate.applicationId || null,
    candidate_name: candidate.candidate_name || candidate.name || `Candidate ${index + 1}`,
    applied_position:
      candidate.applied_position ||
      candidate.job_title ||
      candidate.position ||
      candidate.target_role ||
      'Open role',
    primary_match: clampPercent(candidate.primary_match ?? candidate.ai_score ?? candidate.overall_score ?? candidate.match_score),
    alternative_role: candidate.alternative_role || candidate.matched_role || 'Not suggested',
    status: candidate.status || candidate.pipeline_stage || candidate.stage || 'Under review',
    applied_date: candidate.applied_at || candidate.created_at || candidate.application_date || null,
    email: candidate.email || '',
    candidate_location: candidate.location || candidate.city || '',
    resume_url: candidate.resume_url || candidate.resume_link || candidate.resume_preview_url || '',
    certificates: asArray(candidate.certificates),
    detected_skills: asArray(candidate.detected_skills || candidate.skills),
    missing_skills: asArray(candidate.missing_skills),
    strengths: asArray(candidate.strengths),
    weaknesses: asArray(candidate.weaknesses),
    ai_recommendation:
      candidate.ai_recommendation ||
      candidate.recommendation ||
      candidate.summary ||
      candidate.ai_summary ||
      '',
    recruiter_notes: candidate.recruiter_notes || candidate.notes || '',
    interview_status: candidate.interview_status || candidate.interview || candidate.status || 'Not scheduled',
  }));

  return rows;
}

export function buildStatusDistribution(analytics = {}) {
  const source = firstArray(analytics.funnel, analytics.charts?.pie_chart_hiring_funnel);
  return source.map((item, index) => ({
    label: pickLabel(item, `Status ${index + 1}`),
    value: pickCount(item),
  })).filter((item) => item.label);
}

export function buildMonthlyApplications(analytics = {}) {
  return firstArray(analytics.charts?.line_chart_applications_per_month, analytics.monthly_applications).map((item, index) => ({
    label: pickLabel(item, `Month ${index + 1}`),
    value: pickCount(item),
  }));
}

export function buildMatchScoreTrend(analytics = {}) {
  const source = firstArray(
    analytics.charts?.radar_chart_ai_scores_by_job,
    analytics.charts?.line_chart_average_match_score_by_month,
    analytics.match_scores,
  );

  return source.map((item, index) => ({
    label: pickLabel(item, `Point ${index + 1}`),
    value: clampPercent(item?.value ?? item?.score ?? item?.match_score),
  }));
}

export function buildTopSkills(analytics = {}) {
  const source = firstArray(
    analytics.charts?.bar_chart_top_skills,
    analytics.skill_gap_analysis?.most_common_skills,
    analytics.top_skills,
  );

  return source.map((item, index) => ({
    label: pickLabel(item, `Skill ${index + 1}`),
    value: pickCount(item),
  }));
}

export function buildMissingSkills(analytics = {}) {
  const source = firstArray(
    analytics.skill_gap_analysis?.most_missing_skills,
    analytics.charts?.bar_chart_missing_skills,
    analytics.missing_skills,
  );

  return source.map((item, index) => ({
    label: pickLabel(item, `Gap ${index + 1}`),
    value: pickCount(item),
  }));
}

export function buildRecentActivity(analytics = {}) {
  const insights = asArray(analytics.insights);
  return [
    {
      id: 'overview',
      title: 'Analytics overview loaded',
      description: `Total applications: ${firstNumber(analytics.metrics?.total_applications)}.`,
      time: 'Today',
    },
    insights[0]
      ? {
          id: 'insight-1',
          title: 'AI insight',
          description: String(insights[0]),
          time: 'Today',
        }
      : null,
    insights[1]
      ? {
          id: 'insight-2',
          title: 'Pipeline insight',
          description: String(insights[1]),
          time: 'Today',
        }
      : null,
  ].filter(Boolean);
}

export function buildPendingInterviews(rows = []) {
  return rows
    .filter((row) => {
      const status = String(row.status || row.interview_status || '').toLowerCase();
      return status.includes('interview') || status.includes('pending') || status.includes('schedule');
    })
    .slice(0, 4)
    .map((row) => ({
      id: row.candidate_id,
      candidate_name: row.candidate_name,
      applied_position: row.applied_position,
      interview_status: row.interview_status,
      applied_date: row.applied_date,
    }));
}

export function formatAdminDate(value) {
  return formatDateShort(value);
}
