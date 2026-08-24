import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileText, TrendingUp } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import EmptyState from '../../components/admin/EmptyState';
import StatisticsGrid from '../../components/admin/StatisticsGrid';
import Button from '../../components/ui/Button';
import { analyticsService } from '../../services/analyticsService';
import { unwrapResponse, formatMetricPercent } from '../../utils/dashboard';
import {
  buildAdminKpis,
  buildApplicationsByPosition,
  buildMonthlyApplications,
  buildTopSkills,
} from './adminData';

export default function AdminReportsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadReports() {
      try {
        const response = await analyticsService.overview();
        const data = unwrapResponse(response) || {};
        if (mounted) setAnalytics(data);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.detail || 'Unable to load reports.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  const kpis = useMemo(() => buildAdminKpis(analytics || {}), [analytics]);
  const applicationsByPosition = useMemo(() => buildApplicationsByPosition(analytics || {}), [analytics]);
  const monthlyApplications = useMemo(() => buildMonthlyApplications(analytics || {}), [analytics]);
  const topSkills = useMemo(() => buildTopSkills(analytics || {}), [analytics]);

  if (loading) {
    return <div className="rounded-[16px] border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading reports...</div>;
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
      <section className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Reports</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Recruiting reports</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500">
              Export-ready reporting built from the same analytics feed as the dashboard, without fake metrics or decorative widgets.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button type="button" variant="primary">
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </section>

      <StatisticsGrid
        items={[
          { label: kpis[0].label, value: kpis[0].value, caption: kpis[0].hint },
          { label: kpis[5].label, value: kpis[5].value, caption: kpis[5].hint },
          { label: 'Open Positions', value: kpis[6].value, caption: kpis[6].hint },
          { label: 'Interview Invitations', value: kpis[7].value, caption: kpis[7].hint },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Monthly summary" description="The monthly application trend used in reporting.">
          {monthlyApplications.length ? (
            <div className="h-80">
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
            <EmptyState title="No monthly report data" description="Monthly reporting appears once the analytics service returns trend data." />
          )}
        </AdminCard>

        <AdminCard title="Position demand" description="Hiring demand by role.">
          {applicationsByPosition.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicationsByPosition} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={110} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 999, 999, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No position report data" description="Position demand will render when the analytics endpoint returns it." />
          )}
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AdminCard title="Skill report" description="The most frequently detected skills across the pipeline.">
          {topSkills.length ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSkills}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState title="No skill report data" description="Skill reporting becomes available once the analytics service returns the series." />
          )}
        </AdminCard>

        <AdminCard title="Report notes" description="Executive summary for recruiters and hiring managers.">
          <div className="space-y-3">
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Average match</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {formatMetricPercent(analytics?.metrics?.average_ai_match_score)}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Applications</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {analytics?.metrics?.total_applications ?? 0}
              </p>
            </div>
            <div className="rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                <TrendingUp className="h-4 w-4" />
                Reporting status
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Reports are derived from the live analytics endpoint and only display actual data returned by the backend.
              </p>
            </div>
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
