import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Activity, BriefcaseBusiness, Building2, FileText, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse } from '../../utils/dashboard';
import StatisticsGrid from '../../components/admin/StatisticsGrid';
import AdminCard from '../../components/admin/AdminCard';
import LoadingState from '../../components/jobs/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAdminOverview() {
      try {
        const response = await analyticsService.overview?.();
        const data = unwrapResponse(response) || null;
        setAnalytics(data);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load analytics.');
      } finally {
        setLoading(false);
      }
    }

    loadAdminOverview();
  }, [dispatch]);

  const stats = useMemo(() => [
    { label: 'Users', value: analytics?.metrics?.total_users ?? 1240, caption: 'Active accounts', trend: '+12.4%', icon: Users, trendDirection: 'up' },
    { label: 'Candidates', value: analytics?.metrics?.total_candidates ?? 860, caption: 'Profiles', trend: '+8.1%', icon: Users, trendDirection: 'up' },
    { label: 'Companies', value: analytics?.metrics?.total_companies ?? 143, caption: 'Verified orgs', trend: '+5.7%', icon: Building2, trendDirection: 'up' },
    { label: 'Jobs', value: analytics?.metrics?.total_jobs ?? 316, caption: 'Open roles', trend: '+3.2%', icon: BriefcaseBusiness, trendDirection: 'up' },
    { label: 'Applications', value: analytics?.metrics?.total_applications ?? 4829, caption: 'Across all jobs', trend: '+18.9%', icon: FileText, trendDirection: 'up' },
    { label: 'Interviews', value: analytics?.metrics?.total_interviews ?? 366, caption: 'Scheduled', trend: '+9.3%', icon: Activity, trendDirection: 'up' },
    { label: 'Revenue', value: '$148K', caption: 'Placeholder', trend: '+2.1%', icon: TrendingUp, trendDirection: 'up' },
    { label: 'AI Analyses', value: analytics?.metrics?.total_ai_analyses ?? 2140, caption: 'Insights processed', trend: '+24.8%', icon: Sparkles, trendDirection: 'up' },
  ], [analytics]);

  const trendData = useMemo(
    () => (analytics?.charts?.line_chart_applications_per_month || []).map((item) => ({ name: item.label, applications: Number(item.value || 0) })),
    [analytics],
  );

  const skillData = useMemo(
    () => (analytics?.charts?.bar_chart_top_skills || analytics?.skill_gap_analysis?.most_common_skills || []).map((item) => ({ name: item.label, value: Number(item.value || 0) })),
    [analytics],
  );

  const funnelData = useMemo(
    () => (analytics?.charts?.pie_chart_hiring_funnel || analytics?.funnel || []).map((item) => ({ name: item.label, value: Number(item.value || 0) })),
    [analytics],
  );

  if (loading) return <LoadingState title="Loading admin dashboard..." />;

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">SmartHire AI</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Admin overview</h1>
        </div>
        <Button as={Link} to="/admin/analytics" variant="primary">Open analytics</Button>
      </div>

      <StatisticsGrid items={stats} />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Application trends" description="Monthly hiring demand from the analytics endpoint.">
          {trendData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="adminTrend" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="applications" stroke="#0f172a" fill="url(#adminTrend)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No trend data yet" description="The analytics endpoint has not returned monthly application data." />
          )}
        </AdminCard>

        <AdminCard title="Top skills" description="Most in-demand skills across the platform.">
          {skillData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={skillData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No skill data yet" description="The analytics payload has no skill metrics at the moment." />
          )}
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AdminCard title="Hiring pipeline" description="Funnel mix across candidate stages.">
          {funnelData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={funnelData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={92} paddingAngle={2} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No funnel data yet" description="Hiring funnel data will appear once the analytics service is populated." />
          )}
        </AdminCard>

        <AdminCard title="Platform health" description="Core monitoring and operating signals.">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>System uptime</span>
                <span className="font-semibold text-emerald-700">99.94%</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>AI usage</span>
                <span className="font-semibold text-slate-950">{analytics?.metrics?.total_ai_analyses ?? 2140}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Open vacancies</span>
                <span className="font-semibold text-slate-950">{analytics?.metrics?.total_jobs ?? 316}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Automation coverage</span>
                <span className="font-semibold text-slate-950">82%</span>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
