import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  Globe,
  MapPin,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { loadCompanyDashboard, markAllNotificationsRead, markNotificationRead } from '../../redux/slices/companySlice';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/jobs/LoadingState';
import Button from '../../components/ui/Button';
import DashboardCard from '../../components/dashboard/DashboardCard';
import ChartCard from '../../components/dashboard/ChartCard';
import SectionHeader from '../../components/company/SectionHeader';
import StatisticsGrid from '../../components/company/StatisticsGrid';
import JobCard from '../../components/company/JobCard';
import CandidateCard from '../../components/company/CandidateCard';
import ApplicationTable from '../../components/company/ApplicationTable';
import NotificationPanel from '../../components/company/NotificationPanel';
import CompanyProfileCard from '../../components/company/CompanyProfileCard';
import { clampPercent, formatMetricPercent, getDisplayName } from '../../utils/dashboard';

const COLORS = ['#0f172a', '#38bdf8', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

function resolveCompanyId(user) {
  const direct =
    user?.company_id ??
    user?.companyId ??
    user?.company?.company_id ??
    user?.company?.id ??
    user?.companies?.[0]?.company_id ??
    user?.companies?.[0]?.id;
  const envId = import.meta.env.VITE_COMPANY_DASHBOARD_ID || import.meta.env.VITE_COMPANY_ID;
  const fallback = envId || '1';
  return Number(direct || fallback);
}

function buildDepartmentData(jobs = []) {
  const grouped = new Map();
  jobs.forEach((job) => {
    const key = job.department_name || 'General';
    const current = grouped.get(key) || { label: key, applications: 0, aiScore: 0, count: 0 };
    current.applications += Number(job.applicants_count || 0);
    current.aiScore += Number(job.ai_average_score || 0);
    current.count += 1;
    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((item) => ({
    label: item.label,
    applications: item.applications,
    aiScore: item.count ? Math.round(item.aiScore / item.count) : 0,
  }));
}

function formatCandidateSkills(candidate) {
  const parts = [];
  if (candidate.skill_match != null) {
    parts.push(`${clampPercent(candidate.skill_match)}% skill match`);
  }
  if (candidate.experience_match != null) {
    parts.push(`${clampPercent(candidate.experience_match)}% experience`);
  }
  return parts.join(' | ');
}

export default function CompanyDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const {
    dashboard,
    analytics,
    activeJobs,
    recentApplications,
    topCandidates,
    notifications,
    notificationReadIds,
    status,
    error,
  } = useSelector((state) => state.companies);

  const companyId = useMemo(() => resolveCompanyId(user), [user]);
  const companyName = dashboard?.company_name || user?.company_name || getDisplayName(user || {});

  useEffect(() => {
    if (companyId && status === 'idle') {
      dispatch(loadCompanyDashboard({ companyId }));
    }
  }, [companyId, dispatch, status]);

  const stats = useMemo(() => {
    const acceptedCandidates = recentApplications.filter((item) =>
      ['accepted', 'hired'].includes(String(item.status || '').toLowerCase()),
    ).length;

    return [
      {
        icon: BriefcaseBusiness,
        label: 'Total Jobs',
        value: dashboard?.total_jobs ?? 0,
        hint: 'All company jobs',
        tone: 'slate',
      },
      {
        icon: Sparkles,
        label: 'Active Jobs',
        value: dashboard?.active_jobs ?? activeJobs.length ?? 0,
        hint: 'Open and active roles',
        tone: 'sky',
      },
      {
        icon: Users,
        label: 'Applications',
        value: dashboard?.applications_count ?? recentApplications.length ?? 0,
        hint: 'Live hiring pipeline',
        tone: 'emerald',
      },
      {
        icon: CalendarClock,
        label: 'Interviews',
        value: dashboard?.interviews_count ?? 0,
        hint: 'Scheduled interviews',
        tone: 'amber',
      },
      {
        icon: CheckCircle2,
        label: 'Hired Candidates',
        value: acceptedCandidates,
        hint: 'Recent accepted applications',
        tone: 'rose',
      },
      {
        icon: Target,
        label: 'Average AI Match',
        value: formatMetricPercent(dashboard?.ai_average_score),
        hint: 'Company dashboard average',
        tone: 'slate',
      },
    ];
  }, [activeJobs.length, dashboard?.active_jobs, dashboard?.ai_average_score, dashboard?.applications_count, dashboard?.interviews_count, dashboard?.total_jobs, recentApplications]);

  const applicationTrends = useMemo(
    () =>
      (analytics?.charts?.line_chart_applications_per_month || []).map((point) => ({
        label: point.label,
        applications: Number(point.value || 0),
      })),
    [analytics],
  );

  const topSkills = useMemo(
    () =>
      (analytics?.charts?.bar_chart_top_skills || analytics?.skill_gap_analysis?.most_requested_skills || []).map(
        (point) => ({
          label: point.label,
          value: Number(point.value || 0),
        }),
      ),
    [analytics],
  );

  const hiringFunnel = useMemo(
    () =>
      (analytics?.charts?.pie_chart_hiring_funnel || analytics?.funnel || []).map((point) => ({
        label: point.label,
        value: Number(point.value || 0),
      })),
    [analytics],
  );

  const aiRanking = useMemo(
    () =>
      (analytics?.top_candidates || topCandidates || []).map((candidate, index) => ({
        label: candidate.candidate_name || `Candidate ${index + 1}`,
        score: Number(candidate.ai_score || 0),
      })),
    [analytics, topCandidates],
  );

  const departmentPerformance = useMemo(
    () => buildDepartmentData(activeJobs),
    [activeJobs],
  );

  const companySummary = dashboard
    ? [
        { label: 'Industry', value: dashboard.industry || 'Not provided', icon: Building2 },
        { label: 'Website', value: dashboard.website || 'Not provided', icon: Globe },
        { label: 'Location', value: dashboard.location || 'Not provided', icon: MapPin },
      ]
    : [];

  if (status === 'loading' && !dashboard) {
    return (
      <LoadingState
        title="Loading hiring dashboard..."
        description="Refreshing jobs, applications, and hiring analytics."
      />
    );
  }

  if (error && !dashboard) {
    return (
      <ErrorState
        title="Unable to load the hiring dashboard"
        description={typeof error === 'string' ? error : 'Please try again in a moment.'}
        action={
          <Button
            type="button"
            variant="primary"
            onClick={() => dispatch(loadCompanyDashboard({ companyId }))}
          >
            Retry load
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <section className="overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Enterprise HR Platform
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-slate-900 sm:text-4xl">
              Welcome back, {companyName}.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Review hiring performance, track candidate quality, and move through your pipeline
              with a premium hiring dashboard built on the live backend data.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/jobs" variant="primary" size="lg">
                Create Job
              </Button>
              <Button as={Link} to="#analytics" variant="secondary" size="lg">
                View Analytics
              </Button>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {companySummary.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.label}
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-900">{item.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-5">
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Pending applications
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                {dashboard?.pending_applications ?? 0}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                AI Match average
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                {formatMetricPercent(dashboard?.ai_average_score)}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Departments
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                {dashboard?.departments_count ?? 0}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Overview"
        title="Hiring statistics"
        description="A compact summary of the live hiring pipeline pulled straight from the hiring dashboard endpoint."
        />
        <div className="mt-6">
          <StatisticsGrid items={stats} />
        </div>
      </section>

      <section id="jobs" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Jobs"
          title="Active job cards"
          description="Each card is enriched from the job dashboard endpoint so you can see status, applicants, and AI match quality."
        />
        <div className="mt-6">
          {activeJobs.length ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {activeJobs.map((job) => (
                <JobCard key={job.job_id} job={job} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active jobs"
              description="The backend will populate active jobs once internal job snapshots are available."
            />
          )}
        </div>
      </section>

      <section id="applications" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Applications"
          title="Recent applications"
          description="This table is built from the latest job dashboards and keeps candidate names and AI match scores visible."
        />
        <div className="mt-6">
          <DashboardCard className="p-0">
            <ApplicationTable applications={recentApplications} />
          </DashboardCard>
        </div>
      </section>

      <section id="candidates" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Candidates"
          title="Top candidates"
          description="The strongest applicants from the analytics endpoint appear here with match signals and resume quality context."
        />
        <div className="mt-6">
          {topCandidates.length ? (
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {topCandidates.slice(0, 6).map((candidate, index) => (
                <CandidateCard
                  key={candidate.candidate_id || candidate.candidate_name || index}
                  candidate={{
                    candidate_name: candidate.candidate_name,
                    ai_score: candidate.ai_score,
                    skill_match: candidate.skill_match,
                    experience_match: candidate.experience_match,
                    resume_score: candidate.skill_match,
                    skills: formatCandidateSkills(candidate),
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No candidates yet"
              description="Candidate cards will appear once the analytics endpoint returns enterprise-level results."
            />
          )}
        </div>
      </section>

      <section id="interviews" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Interviews"
          title="Interview readiness"
          description="This summary stays grounded in the current dashboard metrics and recent applications."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <DashboardCard title="Interview volume" description="Current interview activity across the enterprise.">
            <div className="text-4xl font-semibold text-slate-950">{dashboard?.interviews_count ?? 0}</div>
            <p className="mt-2 text-sm text-slate-600">Interviews currently tracked by the backend.</p>
          </DashboardCard>
          <DashboardCard title="Hiring success rate" description="A live indicator based on accepted applications.">
            <div className="text-4xl font-semibold text-slate-950">
              {formatMetricPercent(
                recentApplications.length
                  ? (recentApplications.filter((item) => ['accepted', 'hired'].includes(String(item.status || '').toLowerCase())).length /
                      recentApplications.length) *
                      100
                  : 0,
              )}
            </div>
            <p className="mt-2 text-sm text-slate-600">Calculated from the recent job snapshots.</p>
          </DashboardCard>
          <DashboardCard title="AI average score" description="How the enterprise is trending overall.">
            <div className="text-4xl font-semibold text-slate-950">
              {formatMetricPercent(dashboard?.ai_average_score)}
            </div>
            <p className="mt-2 text-sm text-slate-600">Average AI match from the hiring dashboard endpoint.</p>
          </DashboardCard>
        </div>
      </section>

      <section id="departments" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Departments"
          title="Department performance"
          description="Aggregated from the live job snapshots so team-level hiring pressure is easy to scan."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <DashboardCard title="Department applications" description="Applications grouped by department.">
            {departmentPerformance.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={36} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Bar dataKey="applications" radius={[12, 12, 0, 0]} fill="#0f172a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No department data yet"
                description="Department performance will appear once there are active jobs to aggregate."
              />
            )}
          </DashboardCard>

          <DashboardCard title="Department summary" description="AI match trend per department.">
            <div className="space-y-3">
              {departmentPerformance.length ? (
                departmentPerformance.map((department) => (
                  <article
                    key={department.label}
                    className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold tracking-[-0.02em] text-slate-900">{department.label}</h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {department.applications} applications across recent job snapshots
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatMetricPercent(department.aiScore)}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No department summary yet"
                  description="Department-level analytics are based on active jobs and will appear as soon as that data is available."
                />
              )}
            </div>
          </DashboardCard>
        </div>
      </section>

      <section id="trainings" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Trainings"
          title="Hiring funnel and skill demand"
          description="A compact analytics view that combines application trends, funnel conversion, and skill demand."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartCard title="Application trends" description="Monthly application volume across the company.">
            {applicationTrends.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={applicationTrends}>
                    <defs>
                      <linearGradient id="applicationsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f172a" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
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
                    <Area
                      type="monotone"
                      dataKey="applications"
                      stroke="#0f172a"
                      fill="url(#applicationsGradient)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No application trend data"
                description="The trend chart will appear when the analytics endpoint has monthly data."
              />
            )}
          </ChartCard>

          <ChartCard title="Top skills" description="What the company is requesting most often.">
            {topSkills.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkills} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={96} />
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
                description="Top skills will appear once the analytics service returns requested skills."
              />
            )}
          </ChartCard>

          <ChartCard title="Hiring funnel" description="Conversion through the recruitment pipeline.">
            {hiringFunnel.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={hiringFunnel} dataKey="value" nameKey="label" innerRadius={70} outerRadius={110}>
                      {hiringFunnel.map((entry, index) => (
                        <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '1rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No funnel data yet"
                description="The hiring funnel will render once the backend analytics service returns conversion data."
              />
            )}
          </ChartCard>

          <ChartCard title="AI ranking distribution" description="Top candidate scores from the company analytics payload.">
            {aiRanking.length ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aiRanking}>
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
                    <Line type="monotone" dataKey="score" stroke="#0f172a" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                title="No AI ranking data yet"
                description="The ranking chart will appear when the analytics service returns top candidates."
              />
            )}
          </ChartCard>
        </div>
      </section>

      <section id="company-profile" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Our Company"
          title="Our company"
          description="The dashboard keeps the company profile connected to the backend so details stay consistent."
        />
        <div className="mt-6">
          <CompanyProfileCard company={dashboard} stats={dashboard || {}} />
        </div>
      </section>

      <section id="settings" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Settings"
          title="Dashboard actions"
          description="Quick actions stay lightweight until later workflow tickets introduce deeper CRUD flows."
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <DashboardCard title="Quick actions" description="Entry points for the next internal workflow tickets.">
            <div className="space-y-3">
              <Button as={Link} to="/jobs" variant="primary" className="w-full">
                Browse Jobs
              </Button>
              <Button as={Link} to="#analytics" variant="secondary" className="w-full">
                View Analytics
              </Button>
              <Button as={Link} to="#company-profile" variant="ghost" className="w-full">
                Review Profile
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard title="Hiring health" description="A quick look at the current enterprise funnel.">
            <div className="space-y-3">
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Open roles</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">{dashboard?.active_jobs ?? 0}</p>
              </div>
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Pending review</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-900">
                  {dashboard?.pending_applications ?? 0}
                </p>
              </div>
            </div>
          </DashboardCard>

          <NotificationPanel
            notifications={notifications}
            readIds={notificationReadIds}
            onMarkRead={(id) => dispatch(markNotificationRead(id))}
            onMarkAllRead={() => dispatch(markAllNotificationsRead())}
          />
        </div>
      </section>
    </div>
  );
}

