import { useEffect, useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatisticsGrid from '../../components/admin/StatisticsGrid';
import LoadingState from '../../components/jobs/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse } from '../../utils/dashboard';

const colors = ['bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500'];

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [overview, trends, skills] = await Promise.all([
          analyticsService.overview(), analyticsService.trends(), analyticsService.skills(),
        ]);
        if (!mounted) return;
        const base = unwrapResponse(overview) || {};
        const trendData = unwrapResponse(trends) || {};
        const skillData = unwrapResponse(skills) || {};
        setAnalytics({
          ...base,
          charts: { ...(base.charts || {}), ...(trendData.charts || {}), ...(skillData.charts || {}) },
          skill_gap_analysis: { ...(base.skill_gap_analysis || {}), ...(skillData.skill_gap_analysis || {}) },
        });
        setError('');
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Unable to load analytics.');
      }
    }
    load();
    const interval = window.setInterval(load, 15000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { mounted = false; window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);

  const stats = useMemo(() => {
    const metrics = analytics?.metrics || {};
    const total = Number(metrics.total_applications || 0);
    const accepted = Number(metrics.accepted_applications || 0);
    return [
      { label: 'Total applications', value: total, change: '', direction: 'up' },
      { label: 'Offer rate', value: `${total ? ((accepted / total) * 100).toFixed(1) : '0.0'}%`, change: '', direction: 'up' },
      { label: 'Avg. match score', value: `${Number(metrics.average_ai_match_score || 0).toFixed(1)}%`, change: '', direction: 'up' },
      { label: 'Active jobs', value: Number(metrics.active_jobs || 0), change: '', direction: 'up' },
    ];
  }, [analytics]);

  if (!analytics && !error) return <LoadingState title="Loading analytics..." description="Retrieving live recruitment analytics." />;
  if (!analytics && error) return <ErrorState title="Unable to load analytics" description={error} onRetry={() => window.location.reload()} />;
  const trends = analytics.charts?.line_chart_applications_per_month || [];
  const hiringMix = analytics.charts?.bar_chart_applications_by_position || analytics.charts?.bar_chart_top_skills || [];

  return <AdminCard title="Analytics overview" description="Track platform performance and recruitment outcomes.">
    <div className="space-y-6">
      <StatisticsGrid stats={stats} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold text-slate-950">Recruitment trends</h3><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
          <div className="space-y-3">{trends.length ? trends.map((item) => <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-sm text-slate-600"><span>{item.label}</span><span>{item.value}</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${Math.min(Number(item.value || 0), 100)}%` }} /></div>
          </div>) : <p className="text-sm text-slate-500">No recruitment trend data available.</p>}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Hiring mix</h3>
          <div className="mt-5 space-y-3">{hiringMix.length ? hiringMix.map((item, index) => {
            const amount = Number(item.value || 0);
            return <div key={item.label}><div className="mb-1 flex items-center justify-between text-sm text-slate-600"><span>{item.label}</span><span>{amount}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${colors[index % colors.length]}`} style={{ width: `${Math.min(amount, 100)}%` }} /></div></div>;
          }) : <p className="text-sm text-slate-500">No hiring mix data available.</p>}</div>
        </div>
      </div>
    </div>
  </AdminCard>;
}
