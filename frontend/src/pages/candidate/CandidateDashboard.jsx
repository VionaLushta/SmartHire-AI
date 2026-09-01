import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CalendarClock,
  GraduationCap,
  NotebookPen,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { loadCandidateDashboard, markAllNotificationsRead, markNotificationRead } from '../../redux/slices/candidateSlice';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/jobs/LoadingState';
import Button from '../../components/ui/Button';
import StatCard from '../../components/dashboard/StatCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import ChartCard from '../../components/dashboard/ChartCard';
import SectionTitle from '../../components/dashboard/SectionTitle';
import ProfileCard from '../../components/dashboard/ProfileCard';
import RecommendationCard from '../../components/dashboard/RecommendationCard';
import ApplicationTable from '../../components/dashboard/ApplicationTable';
import NotificationList from '../../components/dashboard/NotificationList';
import InsightsPanel from '../../components/dashboard/InsightsPanel';
import { clampPercent, formatDateShort, formatMetricPercent, getDisplayName } from '../../utils/dashboard';

function MiniStat({ label, value, hint }) {
  return (
    <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function formatResumeLabel(resume) {
  if (!resume) return 'No resume uploaded yet';
  const fileName = resume.file_path?.split(/[\\/]/).pop();
  return fileName || `Resume #${resume.resume_id}`;
}

export default function CandidateDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    dashboard,
    profile,
    analytics,
    recommendedJobs,
    savedJobs,
    applications,
    resume,
    notifications,
    notificationReadIds,
    status,
    error,
  } = useSelector((state) => state.candidate);

  const candidateId = user?.user_id;

  useEffect(() => {
    if (candidateId && status === 'idle') {
      dispatch(loadCandidateDashboard({ candidateId }));
    }
  }, [candidateId, dispatch, status]);

  useEffect(() => {
    if (!candidateId) return undefined;
    const refresh = () => dispatch(loadCandidateDashboard({ candidateId }));
    const timer = window.setInterval(refresh, 15000);
    return () => window.clearInterval(timer);
  }, [candidateId, dispatch]);

  useEffect(() => {
    const handleJobsChanged = () => {
      if (candidateId) {
        dispatch(loadCandidateDashboard({ candidateId }));
      }
    };

    window.addEventListener('jobs:changed', handleJobsChanged);
    return () => window.removeEventListener('jobs:changed', handleJobsChanged);
  }, [candidateId, dispatch]);

  const identity = profile || user || {};
  const displayName = getDisplayName(identity);

  const chartSeries = useMemo(() => {
    const monthlyApplications = analytics?.charts?.line_chart_applications_per_month || [];
    const aiTrend = analytics?.charts?.radar_chart_ai_scores_by_job || [];
    const skillDistribution =
      analytics?.skill_gap_analysis?.most_common_skills ||
      analytics?.charts?.bar_chart_top_skills ||
      [];
    const matchByJob = new Map(
      aiTrend.map((point) => [String(point.label || '').toLowerCase(), clampPercent(point.value)]),
    );

    return {
      monthlyApplications: monthlyApplications.map((point) => ({
        label: point.label,
        applications: Number(point.value || 0),
      })),
      aiTrend: aiTrend.map((point) => ({
        label: point.label,
        score: clampPercent(point.value),
      })),
      skillDistribution: skillDistribution.map((point) => ({
        label: point.label,
        value: Number(point.value || 0),
      })),
      matchByJob,
    };
  }, [analytics]);

  const activityItems = useMemo(() => {
    const items = [
      {
        id: 'activity-applications',
        title: 'Applications tracked',
        description: `${dashboard?.applications_count ?? 0} applications in your pipeline.`,
        time: 'Today',
        icon: BriefcaseBusiness,
      },
      {
        id: 'activity-interviews',
        title: 'Interviews scheduled',
        description: `${dashboard?.interviews_count ?? 0} interviews currently linked to your profile.`,
        time: 'Today',
        icon: CalendarClock,
      },
      {
        id: 'activity-saved',
        title: 'Saved jobs',
        description: `${dashboard?.saved_jobs_count ?? 0} saved jobs waiting for review.`,
        time: 'Today',
        icon: Sparkles,
      },
      {
        id: 'activity-training',
        title: 'Learning activity',
        description: `${dashboard?.training_enrollments_count ?? 0} training enrollments on file.`,
        time: 'This week',
        icon: GraduationCap,
      },
    ];

    if (resume) {
      items.unshift({
        id: 'activity-resume',
        title: 'Resume uploaded',
        description: formatResumeLabel(resume),
        time: 'Recently',
        icon: NotebookPen,
      });
    }

    return items;
  }, [dashboard, resume]);

  const profileCompletion = clampPercent(dashboard?.profile_completion_percent);
  const resumeScore = clampPercent(analytics?.metrics?.average_resume_quality);
  const aiMatchScore = clampPercent(analytics?.metrics?.average_ai_match_score);

  if (status === 'loading' && !dashboard) {
    return (
      <LoadingState
        title="Loading candidate dashboard..."
        description="Fetching application activity, saved jobs, and AI insights."
      />
    );
  }

  if (error && !dashboard) {
    return (
      <ErrorState
        title="Unable to load the candidate dashboard"
        description={typeof error === 'string' ? error : 'Please try again in a moment.'}
        onRetry={() => dispatch(loadCandidateDashboard({ candidateId }))}
      />
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <section
        id="dashboard"
        className="scroll-mt-24 overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
      >
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Candidate Dashboard
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">
              Welcome back, {displayName}.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Keep your candidate workspace sharp, review AI signals, and move through the hiring
              funnel with a premium, focused workflow.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/jobs" variant="primary" size="lg">
                Browse Jobs
              </Button>
              <Button as={Link} to="/profile" variant="secondary" size="lg">
                Edit Profile
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Profile" value={formatMetricPercent(profileCompletion)} hint="Completion score" />
              <MiniStat label="Resume" value={formatMetricPercent(resumeScore)} hint="AI quality score" />
              <MiniStat label="AI Match" value={formatMetricPercent(aiMatchScore)} hint="Average pipeline fit" />
            </div>
          </div>

          <div className="grid gap-4 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-5">
            <MiniStat
              label="Applied jobs"
              value={dashboard?.applications_count ?? 0}
              hint="Backend-connected activity"
            />
            <MiniStat
              label="Interviews"
              value={dashboard?.interviews_count ?? 0}
              hint="Scheduled or in progress"
            />
            <MiniStat
              label="Saved jobs"
              value={dashboard?.saved_jobs_count ?? 0}
              hint="Ready for follow-up"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={BriefcaseBusiness}
          label="Applied Jobs"
          value={dashboard?.applications_count ?? 0}
          hint="Jobs in your pipeline"
          tone="slate"
        />
        <StatCard
          icon={Sparkles}
          label="Saved Jobs"
          value={dashboard?.saved_jobs_count ?? 0}
          hint="Opportunities bookmarked"
          tone="sky"
        />
        <StatCard
          icon={CalendarClock}
          label="Interviews"
          value={dashboard?.interviews_count ?? 0}
          hint="Backed by the API"
          tone="emerald"
        />
        <StatCard
          icon={NotebookPen}
          label="Resume Score"
          value={formatMetricPercent(resumeScore)}
          hint="AI resume quality"
          tone="amber"
        />
        <StatCard
          icon={Target}
          label="AI Match %"
          value={formatMetricPercent(aiMatchScore)}
          hint="Average fit across jobs"
          tone="rose"
        />
      </section>

      <section>
        <SectionTitle
          eyebrow="Analytics"
          title="Performance charts"
          description="Applications over time, AI match trend, and skill distribution rendered from the backend analytics payload."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ChartCard
            title="Applications over time"
            description="Monthly application volume from the AI dashboard."
          >
            {chartSeries.monthlyApplications.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartSeries.monthlyApplications}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="applications"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No application chart data yet"
                description="The backend will populate this as candidate activity grows."
              />
            )}
          </ChartCard>

          <ChartCard title="AI Match trend" description="Score distribution across the active job set.">
            {chartSeries.aiTrend.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartSeries.aiTrend}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Radar
                      dataKey="score"
                      stroke="#0f172a"
                      fill="#0f172a"
                      fillOpacity={0.18}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No AI trend data yet"
                description="The analytics endpoint will populate this when job-level data is available."
              />
            )}
          </ChartCard>

          <ChartCard title="Skill distribution" description="Common skills from the analytics skill analysis.">
            {chartSeries.skillDistribution.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSeries.skillDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={90} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 999, 999, 0]} fill="#38bdf8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No skill data yet"
                description="Skill distribution will appear once the analytics service returns candidate skill data."
              />
            )}
          </ChartCard>
        </div>
      </section>

      <section id="applications" className="scroll-mt-24">
        <SectionTitle
          eyebrow="Applications"
          title="Recent applications"
          description="If the backend exposes application rows, they appear here with company, status, date, and AI score."
        />
        <div className="mt-6">
          <DashboardCard className="p-0">
            <ApplicationTable applications={applications} />
          </DashboardCard>
        </div>
      </section>

      <section id="saved-jobs" className="scroll-mt-24">
        <SectionTitle
          eyebrow="Saved Jobs"
          title="Saved and recommended opportunities"
          description="Your saved jobs sit alongside backend-recommended matches so you can move quickly on the best fit."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <DashboardCard title="Saved jobs" description="Jobs you already bookmarked for later review.">
            {savedJobs.length ? (
              <div className="grid gap-4">
                {savedJobs.slice(0, 3).map((job) => (
                  <article
                    key={`${job.job_id}-${job.saved_at || job.title}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-950">{job.title}</h4>
                        <p className="mt-1 text-sm text-slate-600">{job.company_name}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                          Saved {formatDateShort(job.saved_at)}
                        </p>
                      </div>
                      <Button as={Link} to={`/jobs/${job.job_id}`} variant="secondary" size="sm">
                        View
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved jobs yet"
                description="Save jobs from the jobs page and they will appear here."
              />
            )}
          </DashboardCard>

          <DashboardCard title="Recommended jobs" description="Backend recommendations enriched with salary details.">
            {recommendedJobs.length ? (
              <div className="grid gap-4">
                {recommendedJobs.slice(0, 3).map((job) => (
                  <RecommendationCard
                    key={job.job_id}
                    job={job}
                    matchPercent={chartSeries.matchByJob.get(String(job.title || '').toLowerCase())}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recommendations yet"
                description="The candidate dashboard will surface recommendations once the backend returns them."
              />
            )}
          </DashboardCard>
        </div>
      </section>

      <section id="profile" className="scroll-mt-24">
        <SectionTitle
          eyebrow="Profile"
          title="Profile summary"
          description="A concise overview of your candidate profile, loaded from the backend."
        />
        <div className="mt-6">
          <ProfileCard profile={identity} completion={profileCompletion} />
        </div>
      </section>

      <section id="resume" className="scroll-mt-24">
        <SectionTitle
          eyebrow="Resume"
          title="Resume and credential progress"
          description="Resume, certificates, education, and training are broken into individual cards for quick scanning."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <DashboardCard
            title="Latest resume"
            description="The backend returns the latest uploaded resume and parsed text when available."
          >
            {resume ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{formatResumeLabel(resume)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Parsed text: {resume.parsed_text ? 'Available' : 'Not parsed yet'}
                  </p>
                </div>
                <Button as={Link} to="/resume" variant="primary">
                  Open Resume
                </Button>
              </div>
            ) : (
              <EmptyState
                title="No resume uploaded"
                description="Upload a resume to improve analysis and match quality."
              />
            )}
          </DashboardCard>

          <div className="grid gap-6 sm:grid-cols-2">
            <DashboardCard id="certificates" title="Certificates" description="Credential count from the backend.">
              <div className="space-y-3">
                <div className="text-4xl font-semibold text-slate-950">{dashboard?.certificates_count ?? 0}</div>
                <p className="text-sm text-slate-600">
                  Keep certifications visible to improve matching and credibility.
                </p>
              </div>
            </DashboardCard>

            <DashboardCard id="education" title="Education" description="Education details can be added in a later ticket.">
              <EmptyState
                title="Education details not exposed yet"
                description="Once the backend returns education records, they will render here."
              />
            </DashboardCard>

            <DashboardCard id="trainings" title="Trainings" description="Enrollment counts from the candidate dashboard.">
              <div className="space-y-3">
                <div className="text-4xl font-semibold text-slate-950">
                  {dashboard?.training_enrollments_count ?? 0}
                </div>
                <p className="text-sm text-slate-600">
                  Training activity is surfaced directly from the backend.
                </p>
              </div>
            </DashboardCard>

            <DashboardCard id="settings" title="Settings" description="Quick profile and notification actions.">
              <div className="space-y-3">
                <Button as={Link} to="/profile" variant="secondary" className="w-full">
                  Manage Profile
                </Button>
                <Button as={Link} to="/jobs" variant="ghost" className="w-full">
                  Explore More Jobs
                </Button>
              </div>
            </DashboardCard>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DashboardCard
          id="recent-activity"
          title="Recent activity"
          description="A calm activity feed built from real dashboard values."
        >
          <div className="space-y-3">
            {activityItems.map((item) => {
              const Icon = item.icon;
              return (
                  <article
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(15,23,42,0.08)] bg-slate-50 text-slate-700">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h4 className="font-semibold tracking-[-0.02em] text-slate-900">{item.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
                    {item.time}
                  </span>
                </article>
              );
            })}
          </div>
        </DashboardCard>

        <DashboardCard
          id="notifications"
          title="Notifications"
          description="Unread state stays local while the content is backed by dashboard data."
          action={
            <Button type="button" variant="ghost" size="sm" onClick={() => dispatch(markAllNotificationsRead())}>
              Mark all read
            </Button>
          }
        >
          <NotificationList
            items={notifications}
            readIds={notificationReadIds}
            onMarkRead={(id) => dispatch(markNotificationRead(id))}
            onMarkAllRead={() => dispatch(markAllNotificationsRead())}
          />
        </DashboardCard>
      </section>

      <section>
        <SectionTitle
          eyebrow="AI Insights"
          title="Candidate AI insights"
          description="Signals from the AI dashboard that help you understand fit, gaps, and next steps."
        />
        <div className="mt-6">
          <DashboardCard>
            <InsightsPanel analytics={analytics} />
          </DashboardCard>
        </div>
      </section>
    </div>
  );
}
