import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import {
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  FileDown,
  Mail,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse, getInitials, formatMetricPercent } from '../../utils/dashboard';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/admin/StatusBadge';
import {
  asArray,
  buildAdminKpis,
  buildApplicationsByPosition,
  buildCandidateRows,
  buildMatchScoreTrend,
  buildMissingSkills,
  buildMonthlyApplications,
  buildPendingInterviews,
  buildRecentActivity,
  buildStatusDistribution,
  buildTopSkills,
} from './adminData';

const COLORS = ['#0f172a', '#2563eb', '#0f766e', '#b45309', '#475569', '#64748b'];

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 border-b border-[rgba(15,23,42,0.08)] pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <article className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
          {hint ? <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={`flex h-10 w-10 items-center justify-center rounded-[12px] ${tones[tone]}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <AdminCard title={title} description={description} className="h-full">
      {children}
    </AdminCard>
  );
}

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadAdminOverview() {
      try {
        const [overviewResult, trendsResult, skillsResult] = await Promise.allSettled([
          analyticsService.overview(),
          analyticsService.trends(),
          analyticsService.skills(),
        ]);

        const overview = unwrapResponse(overviewResult.status === 'fulfilled' ? overviewResult.value : null) || {};
        const trends = unwrapResponse(trendsResult.status === 'fulfilled' ? trendsResult.value : null) || {};
        const skills = unwrapResponse(skillsResult.status === 'fulfilled' ? skillsResult.value : null) || {};

        const merged = {
          ...overview,
          ...trends,
          ...skills,
          charts: {
            ...(overview.charts || {}),
            ...(trends.charts || {}),
            ...(skills.charts || {}),
          },
          metrics: {
            ...(overview.metrics || {}),
            ...(trends.metrics || {}),
            ...(skills.metrics || {}),
          },
          skill_gap_analysis: {
            ...(overview.skill_gap_analysis || {}),
            ...(skills.skill_gap_analysis || {}),
          },
          insights: asArray(overview.insights).length
            ? overview.insights
            : asArray(trends.insights).length
              ? trends.insights
              : asArray(skills.insights),
          funnel: asArray(overview.funnel).length
            ? overview.funnel
            : asArray(trends.funnel).length
              ? trends.funnel
              : asArray(skills.funnel),
          top_candidates: asArray(overview.top_candidates).length
            ? overview.top_candidates
            : asArray(trends.top_candidates).length
              ? trends.top_candidates
              : asArray(skills.top_candidates),
          applications_by_position:
            asArray(overview.applications_by_position).length
              ? overview.applications_by_position
              : asArray(trends.applications_by_position).length
                ? trends.applications_by_position
                : skills.applications_by_position || [],
        };

        if (mounted) {
          setAnalytics(merged);
        }
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.detail || 'Unable to load analytics.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadAdminOverview();

    return () => {
      mounted = false;
    };
  }, []);

  const kpis = useMemo(() => buildAdminKpis(analytics || {}), [analytics]);
  const applicationsByPosition = useMemo(() => buildApplicationsByPosition(analytics || {}), [analytics]);
  const statusDistribution = useMemo(() => buildStatusDistribution(analytics || {}), [analytics]);
  const monthlyApplications = useMemo(() => buildMonthlyApplications(analytics || {}), [analytics]);
  const matchTrend = useMemo(() => buildMatchScoreTrend(analytics || {}), [analytics]);
  const topSkills = useMemo(() => buildTopSkills(analytics || {}), [analytics]);
  const missingSkills = useMemo(() => buildMissingSkills(analytics || {}), [analytics]);
  const candidateRows = useMemo(() => buildCandidateRows(analytics || {}), [analytics]);
  const recentActivity = useMemo(() => buildRecentActivity(analytics || {}), [analytics]);
  const pendingInterviews = useMemo(() => buildPendingInterviews(candidateRows), [candidateRows]);

  if (loading) {
    return (
      <LoadingState
        title="Loading admin dashboard..."
        description="Refreshing live applications, analytics, and recruiter activity."
      />
    );
  }

  if (error && !analytics) {
    return (
      <ErrorState
        title="Unable to load admin dashboard"
        description={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const priorityStats = [
    { label: 'Applications', value: analytics?.metrics?.total_applications ?? 0 },
    { label: 'Interview invites', value: analytics?.metrics?.interview_invitations ?? analytics?.metrics?.total_interviews ?? 0 },
    { label: 'Open positions', value: analytics?.metrics?.total_jobs ?? analytics?.metrics?.open_positions ?? 0 },
    { label: 'Average match', value: formatMetricPercent(analytics?.metrics?.average_ai_match_score) },
  ];

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">SmartHire AI</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Enterprise applicant tracking command center
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              A recruiter-focused workspace for reviewing applications, comparing candidate fit, and moving
              hiring decisions forward with live analytics data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button as={Link} to="/admin/candidates" variant="secondary">
              Open candidates
            </Button>
            <Button as={Link} to="/admin/reports" variant="secondary">
              View reports
            </Button>
            <Button as={Link} to="/admin/analytics" variant="primary">
              Open analytics
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {priorityStats.map((item) => (
            <div key={item.label} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-[28px] font-semibold tracking-[-0.04em] text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon={BriefcaseBusiness} tone="slate" {...kpis[0]} />
          <KpiCard icon={CheckCircle2} tone="emerald" {...kpis[1]} />
          <KpiCard icon={Send} tone="amber" {...kpis[2]} />
          <KpiCard icon={Users} tone="blue" {...kpis[3]} />
          <KpiCard icon={Sparkles} tone="emerald" {...kpis[4]} />
          <KpiCard icon={Sparkles} tone="blue" {...kpis[5]} />
          <KpiCard icon={BriefcaseBusiness} tone="slate" {...kpis[6]} />
          <KpiCard icon={CalendarClock} tone="amber" {...kpis[7]} />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section>
            <SectionHeader
              eyebrow="Analytics"
              title="Recruiting charts"
              description="These charts are built from the live analytics response and keep the dashboard grounded in real hiring data."
            />

            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <ChartCard
                title="Applications by position"
                description="Demand by role based on the analytics payload."
              >
                {applicationsByPosition.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={applicationsByPosition}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No position data yet"
                    description="The analytics endpoint has not returned applications by position."
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Candidate status distribution"
                description="Recruiting pipeline balance across stages."
              >
                {statusDistribution.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDistribution} dataKey="value" nameKey="label" innerRadius={56} outerRadius={92} paddingAngle={2}>
                          {statusDistribution.map((entry, index) => (
                            <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No status data yet"
                    description="Pipeline status distribution will appear when the backend returns funnel data."
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Applications per month"
                description="Monthly application volume pulled from analytics."
              >
                {monthlyApplications.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyApplications}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#0f172a" fill="#0f172a" fillOpacity={0.08} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No monthly data yet"
                    description="Monthly application volume will render once the analytics service returns trends."
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Average match score"
                description="Fit trend across the current recruiting pipeline."
              >
                {matchTrend.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={matchTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="label" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No match score trend yet"
                    description="Match score movement will appear when the analytics endpoint provides score data."
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Top skills detected"
                description="Most frequently detected skills from candidate data."
              >
                {topSkills.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topSkills} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0f766e" radius={[0, 999, 999, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No detected skills yet"
                    description="Top skills will appear once the analytics service returns skill data."
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Most missing skills"
                description="Skill gaps that recur across candidate reviews."
              >
                {missingSkills.length ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={missingSkills} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#b45309" radius={[0, 999, 999, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    title="No missing skills yet"
                    description="Missing skill patterns will appear when the analytics endpoint returns gap analysis."
                  />
                )}
              </ChartCard>
            </div>
          </section>

          <section>
            <SectionHeader
              eyebrow="Applications"
              title="Recruiter application table"
              description="A dense ATS table for triaging candidates without turning the interface into a marketing page."
            />

            <AdminCard className="mt-6 p-0">
              {candidateRows.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[rgba(15,23,42,0.08)] text-left">
                    <thead className="bg-slate-50/80">
                      <tr>
                        {['Candidate', 'Applied Position', 'Primary Match', 'Alternative Role', 'Status', 'Applied Date', 'Actions'].map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="px-4 py-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(15,23,42,0.08)] bg-white">
                      {candidateRows.map((candidate) => (
                        <tr key={candidate.candidate_id} className="align-top transition hover:bg-slate-50/80">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar initials={getInitials({ first_name: candidate.candidate_name })} size="sm" />
                              <div>
                                <p className="font-semibold tracking-[-0.02em] text-slate-950">{candidate.candidate_name}</p>
                                <p className="mt-1 text-sm text-slate-500">{candidate.email || candidate.candidate_location || 'Candidate profile on file'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{candidate.applied_position}</td>
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-950">{formatMetricPercent(candidate.primary_match)}</p>
                              <div className="h-1.5 w-24 rounded-full bg-slate-100">
                                <div
                                  className="h-1.5 rounded-full bg-slate-900"
                                  style={{ width: `${Math.max(0, Math.min(100, candidate.primary_match || 0))}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">{candidate.alternative_role}</td>
                          <td className="px-4 py-4"><StatusBadge status={candidate.status} /></td>
                          <td className="px-4 py-4 text-sm text-slate-500">{formatAdminDate(candidate.applied_date)}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Button as={Link} to={`/admin/candidates/${candidate.candidate_id}`} size="sm" variant="secondary">
                                View
                              </Button>
                              <Button type="button" size="sm" variant="secondary">
                                Accept
                              </Button>
                              <Button type="button" size="sm" variant="secondary">
                                Reject
                              </Button>
                              <Button type="button" size="sm" variant="ghost">
                                <FileDown className="h-4 w-4" />
                              </Button>
                              {candidate.email ? (
                                <Button as="a" href={`mailto:${candidate.email}`} size="sm" variant="ghost">
                                  <Mail className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button type="button" size="sm" variant="ghost" disabled>
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  title="No candidate rows yet"
                  description="The analytics service has not returned any candidate records for the table."
                />
              )}
            </AdminCard>
          </section>
        </div>

        <aside className="space-y-6">
          <AdminCard
            title="Recent activity"
            description="Live platform events surfaced from the analytics payload."
          >
            <div className="space-y-3">
              {recentActivity.length ? (
                recentActivity.map((item) => (
                  <article key={item.id} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold tracking-[-0.02em] text-slate-950">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-[0.22em] text-slate-500">{item.time}</span>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="No recent activity" description="Activity will appear once the analytics service returns insights." />
              )}
            </div>
          </AdminCard>

          <AdminCard
            title="Notifications"
            description="Operational reminders for the recruiting team."
          >
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50">
                  <Bell className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <p className="font-semibold tracking-[-0.02em] text-slate-950">Pending review</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {analytics?.metrics?.under_review_applications ?? analytics?.metrics?.reviewing_applications ?? 0} applications remain under review.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-[rgba(15,23,42,0.08)] bg-slate-50">
                  <Send className="h-4 w-4 text-slate-700" />
                </div>
                <div>
                  <p className="font-semibold tracking-[-0.02em] text-slate-950">Interview invitations</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {analytics?.metrics?.interview_invitations ?? analytics?.metrics?.total_interviews ?? 0} invitations tracked from the analytics feed.
                  </p>
                </div>
              </div>
            </div>
          </AdminCard>

          <AdminCard
            title="Pending interviews"
            description="Candidates waiting for interview scheduling or follow-up."
          >
            <div className="space-y-3">
              {pendingInterviews.length ? (
                pendingInterviews.map((candidate) => (
                  <article key={candidate.id} className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold tracking-[-0.02em] text-slate-950">{candidate.candidate_name}</p>
                        <p className="mt-1 text-sm text-slate-600">{candidate.applied_position}</p>
                      </div>
                      <Pill tone="amber">{candidate.interview_status}</Pill>
                    </div>
                    <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-500">
                      Applied {formatAdminDate(candidate.applied_date)}
                    </p>
                  </article>
                ))
              ) : (
                <EmptyState title="No pending interviews" description="Interview tasks will appear once the pipeline includes scheduled steps." />
              )}
            </div>
          </AdminCard>

          <AdminCard title="Pipeline snapshot" description="Current status mix from the analytics payload.">
            <div className="space-y-3">
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Under review</span>
                  <span className="font-semibold text-slate-950">{analytics?.metrics?.under_review_applications ?? 0}</span>
                </div>
              </div>
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Accepted</span>
                  <span className="font-semibold text-slate-950">{analytics?.metrics?.accepted_applications ?? 0}</span>
                </div>
              </div>
              <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Rejected</span>
                  <span className="font-semibold text-slate-950">{analytics?.metrics?.rejected_applications ?? 0}</span>
                </div>
              </div>
            </div>
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}
