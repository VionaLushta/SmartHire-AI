import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  Download,
  FileDown,
  Filter,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  CircleSlash,
} from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/admin/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import LoadingState from '../../components/jobs/LoadingState';
import { reportService } from '../../services/reportService';
import { unwrapItems, unwrapResponse, formatDateShort, formatDateTimeShort, formatMetricPercent, toReadableLabel } from '../../utils/dashboard';

const CHART_COLORS = ['#2563eb', '#0f766e', '#7c3aed', '#f59e0b', '#ef4444', '#64748b'];

const DEFAULT_FILTERS = {
  dataset: 'demo',
  start_date: '',
  end_date: '',
  department_id: '',
  job_id: '',
  recruiter_id: '',
  status: '',
};

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Shortlisted', value: 'shortlisted' },
  { label: 'Interview scheduled', value: 'interview_scheduled' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'On hold', value: 'on_hold' },
  { label: 'Hired', value: 'hired' },
  { label: 'Offer', value: 'offer' },
];

function normalizePoints(points = []) {
  return points
    .map((item) => ({
      label: String(item?.label || item?.name || item?.title || ''),
      value: Number(item?.value ?? item?.count ?? item?.score ?? 0),
      description: item?.description ? String(item.description) : '',
    }))
    .filter((item) => item.label);
}

function normalizeOptions(points = []) {
  return points
    .map((item) => ({
      label: String(item?.label || item?.name || item?.title || ''),
      value: String(item?.value ?? ''),
    }))
    .filter((item) => item.label);
}

function formatValue(value) {
  const number = Number(value ?? 0);
  if (Number.isNaN(number)) return '0';
  return new Intl.NumberFormat('en-US').format(number);
}

function mapReportType(type) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('pdf')) return 'PDF';
  if (normalized.includes('csv')) return 'CSV';
  if (normalized.includes('excel') || normalized.includes('xlsx')) return 'Excel';
  return toReadableLabel(type || 'Report');
}

function SectionHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-[rgba(15,23,42,0.08)] pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{eyebrow}</p>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, tone = 'slate', accent = 'bg-slate-50 text-slate-700' }) {
  const toneMap = {
    slate: 'border-slate-200',
    blue: 'border-blue-200',
    emerald: 'border-emerald-200',
    amber: 'border-amber-200',
    rose: 'border-rose-200',
  };

  return (
    <article className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-[32px] font-semibold tracking-[-0.05em] text-slate-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
        </div>
        {Icon ? (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${accent} ${toneMap[tone] || toneMap.slate}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function ChartCard({ title, description, children, emptyTitle, emptyDescription, hasData }) {
  return (
    <AdminCard title={title} description={description} className="h-full rounded-[20px]">
      {hasData ? (
        children
      ) : (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      )}
    </AdminCard>
  );
}

function PillList({ items = [], tone = 'slate' }) {
  const toneClasses = {
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  if (!items.length) {
    return <p className="text-sm leading-6 text-slate-500">No analysis available yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={`${item.label}-${item.value}`}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${toneClasses[tone]}`}
        >
          {item.label}
          {item.value !== undefined && item.value !== null ? <span className="ml-2 opacity-70">{formatValue(item.value)}</span> : null}
        </span>
      ))}
    </div>
  );
}

function LoadingBanner({ text }) {
  return (
    <div className="rounded-[16px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
      {text}
    </div>
  );
}

function EmptyReportRow() {
  return (
    <tr>
      <td colSpan={5} className="px-4 py-12">
        <EmptyState title="No reports available" description="Generate a report or export one from the live analytics data." />
      </td>
    </tr>
  );
}

export default function AdminReportsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('slate');
  const [busyAction, setBusyAction] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const hasData = Boolean(analytics) || reports.length > 0;
      if (hasData) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [analyticsResult, reportsResult] = await Promise.allSettled([
          reportService.analytics(appliedFilters),
          reportService.list(appliedFilters),
        ]);

        const analyticsData =
          analyticsResult.status === 'fulfilled' ? unwrapResponse(analyticsResult.value) : null;
        const reportData = reportsResult.status === 'fulfilled' ? unwrapItems(reportsResult.value) : [];
        const nextError =
          analyticsResult.status === 'rejected'
            ? analyticsResult.reason
            : reportsResult.status === 'rejected'
              ? reportsResult.reason
              : null;

        if (!mounted) return;

        if (analyticsData) {
          setAnalytics(analyticsData);
        }
        setReports(reportData);
        setError(nextError ? nextError?.response?.data?.detail || nextError?.message || 'Unable to load reports.' : null);
      } finally {
        if (!mounted) return;
        setLoading(false);
        setRefreshing(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [appliedFilters, refreshToken]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRefreshToken((value) => value + 1);
    }, 30000);
    const onFocus = () => setRefreshToken((value) => value + 1);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const metrics = analytics?.kpis || {};
  const chartData = analytics?.charts || {};
  const aiAnalytics = analytics?.ai_analytics || {};
  const filterOptions = analytics?.filter_options || {};
  const summary = analytics?.summary || [];
  const datasetLabel = appliedFilters.dataset === 'demo' ? 'Demo' : 'Live';

  const departmentOptions = normalizeOptions(filterOptions.departments || []);
  const jobOptions = normalizeOptions(filterOptions.jobs || []);
  const recruiterOptions = normalizeOptions(filterOptions.recruiters || []);

  const reportRows = useMemo(
    () =>
      reports.map((item) => ({
        ...item,
        created_label: formatDateTimeShort(item.created_at),
        type_label: mapReportType(item.type),
      })),
    [reports],
  );

  const kpiCards = [
    {
      label: 'Total Applications',
      value: formatValue(metrics.total_applications || 0),
      hint: `All ${datasetLabel.toLowerCase()} applications in the selected scope.`,
      icon: Users,
      tone: 'blue',
      accent: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Active Jobs',
      value: formatValue(metrics.active_jobs || 0),
      hint: `Open or published jobs in the ${datasetLabel.toLowerCase()} scope.`,
      icon: BriefcaseBusiness,
      tone: 'emerald',
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Interviews',
      value: formatValue(metrics.interviews || 0),
      hint: `Applications in the ${datasetLabel.toLowerCase()} scope that reached an interview stage.`,
      icon: CalendarClock,
      tone: 'amber',
      accent: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Hired',
      value: formatValue(metrics.hired || 0),
      hint: `Accepted or hired candidates in the ${datasetLabel.toLowerCase()} scope.`,
      icon: CheckCircle2,
      tone: 'emerald',
      accent: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Rejected',
      value: formatValue(metrics.rejected || 0),
      hint: `Candidates closed out of the ${datasetLabel.toLowerCase()} pipeline.`,
      icon: CircleSlash,
      tone: 'rose',
      accent: 'bg-rose-50 text-rose-700',
    },
    {
      label: 'Average Match Score',
      value: formatMetricPercent(metrics.average_match_score || 0),
      hint: `Average AI fit across the selected ${datasetLabel.toLowerCase()} data.`,
      icon: BarChart3,
      tone: 'slate',
      accent: 'bg-slate-50 text-slate-700',
    },
    { label: 'Pending', value: formatValue(metrics.pending_applications || 0), hint: `${datasetLabel} applications awaiting review.`, icon: Users, tone: 'amber', accent: 'bg-amber-50 text-amber-700' },
    { label: 'Under Review', value: formatValue(metrics.under_review_applications || 0), hint: `${datasetLabel} applications in active review.`, icon: Users, tone: 'blue', accent: 'bg-blue-50 text-blue-700' },
    { label: 'Accepted', value: formatValue(metrics.accepted_candidates || 0), hint: `${datasetLabel} candidates accepted.`, icon: CheckCircle2, tone: 'emerald', accent: 'bg-emerald-50 text-emerald-700' },
    { label: 'Highest Match', value: formatMetricPercent(metrics.highest_match_score || 0), hint: `Best ${datasetLabel.toLowerCase()} candidate match.`, icon: Sparkles, tone: 'blue', accent: 'bg-blue-50 text-blue-700' },
  ];

  const statusPieData = normalizePoints(chartData.candidate_status_distribution || []);
  const funnelData = normalizePoints(chartData.hiring_funnel || []);
  const matchData = normalizePoints(chartData.ai_match_distribution || []);
  const monthlyData = normalizePoints(chartData.applications_per_month || []);
  const departmentData = normalizePoints(chartData.applications_by_department || []);
  const jobData = normalizePoints(chartData.applications_by_job || []);
  const locationData = normalizePoints(chartData.applications_by_location || []);
  const topSkills = normalizePoints(aiAnalytics.top_skills || []);
  const missingSkills = normalizePoints(aiAnalytics.missing_skills || []);
  const topDepartments = normalizePoints(aiAnalytics.top_departments || []);
  const bestJobs = aiAnalytics.best_performing_jobs || [];
  const hardestJobs = aiAnalytics.hardest_jobs_to_fill || [];

  async function handleApplyFilters(event) {
    event.preventDefault();
    setMessage('');
    setError(null);
    setAppliedFilters(draftFilters);
  }

  function handleResetFilters() {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  }

  function updateFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  async function handleExport(format) {
    try {
      setBusyAction(format);
      setMessage('');
      const response =
        format === 'pdf'
          ? await reportService.exportPdf(appliedFilters)
          : format === 'excel'
            ? await reportService.exportExcel(appliedFilters)
            : await reportService.exportCsv(appliedFilters);
      const fallbackName = `reports.${format === 'excel' ? 'xlsx' : format}`;
      await reportService.downloadBlob(response, fallbackName);
      setMessage(`Exported ${mapReportType(format)} report successfully.`);
      setMessageTone('emerald');
      setRefreshToken((value) => value + 1);
    } catch (err) {
      setMessage(err?.response?.data?.detail || err?.message || 'Unable to export report.');
      setMessageTone('rose');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDownload(report) {
    try {
      setBusyAction(report.report_id);
      setMessage('');
      const response = await reportService.download(report.report_id);
      await reportService.downloadBlob(response, report.file_name || 'report.pdf');
      setMessage('Report downloaded.');
      setMessageTone('emerald');
    } catch (err) {
      setMessage(err?.response?.data?.detail || err?.message || 'Unable to download report.');
      setMessageTone('rose');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete(reportId) {
    if (!window.confirm('Delete this report?')) {
      return;
    }
    try {
      setBusyAction(reportId);
      setMessage('');
      await reportService.delete(reportId);
      setMessage('Report deleted.');
      setMessageTone('emerald');
      setRefreshToken((value) => value + 1);
    } catch (err) {
      setMessage(err?.response?.data?.detail || err?.message || 'Unable to delete report.');
      setMessageTone('rose');
    } finally {
      setBusyAction(null);
    }
  }

  if (loading && !analytics) {
    return <LoadingState title="Loading reports..." description="Pulling live analytics, exports, and report inventory." />;
  }

  if (error && !analytics) {
    return <ErrorState title="Unable to load reports" description={error} onRetry={() => setRefreshToken((value) => value + 1)} />;
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Reports</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">Live recruiting reports</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500">
              Export-ready reporting built from live jobs, applications, candidates, and departments. The charts, KPI cards, and report table refresh from backend data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => handleExport('csv')} loading={busyAction === 'csv'}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button type="button" variant="secondary" onClick={() => handleExport('excel')} loading={busyAction === 'excel'}>
              <FileDown className="h-4 w-4" />
              Export Excel
            </Button>
            <Button type="button" variant="primary" onClick={() => handleExport('pdf')} loading={busyAction === 'pdf'}>
              <Sparkles className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-800">
            {datasetLabel} Data
            </span>
            <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-1.5 font-medium text-slate-700">
            Generated {analytics?.generated_at ? formatDateTimeShort(analytics.generated_at) : 'recently'}
          </span>
          {refreshing ? <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-medium text-blue-700">Refreshing live data...</span> : null}
        </div>

        {message ? (
          <div className={`mt-5 rounded-[16px] border px-4 py-3 text-sm font-medium ${
            messageTone === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : messageTone === 'rose'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
          }`}>
            {message}
          </div>
        ) : null}
      </section>

      <AdminCard title="Filters" description="Filter the report snapshots and analytics by date, department, job, recruiter, and status.">
        <form onSubmit={handleApplyFilters} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="field-group">
              <span className="field-label">Dataset</span>
              <select
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.dataset}
                onChange={(event) => updateFilter('dataset', event.target.value)}
              >
                <option value="demo">Demo data</option>
                <option value="live">Live data</option>
              </select>
            </label>
            <label className="field-group">
              <span className="field-label">Date range start</span>
              <input
                type="date"
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.start_date}
                onChange={(event) => updateFilter('start_date', event.target.value)}
              />
            </label>
            <label className="field-group">
              <span className="field-label">Date range end</span>
              <input
                type="date"
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.end_date}
                onChange={(event) => updateFilter('end_date', event.target.value)}
              />
            </label>
            <label className="field-group">
              <span className="field-label">Department</span>
              <select
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.department_id}
                onChange={(event) => updateFilter('department_id', event.target.value)}
              >
                <option value="">All departments</option>
                {departmentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span className="field-label">Job</span>
              <select
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.job_id}
                onChange={(event) => updateFilter('job_id', event.target.value)}
              >
                <option value="">All jobs</option>
                {jobOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group">
              <span className="field-label">Recruiter</span>
              <select
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.recruiter_id}
                onChange={(event) => updateFilter('recruiter_id', event.target.value)}
              >
                <option value="">All recruiters</option>
                {recruiterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <label className="field-group w-full max-w-xs">
              <span className="field-label">Status</span>
              <select
                className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-900 outline-none transition duration-150 ease-out focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                value={draftFilters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={handleResetFilters}>
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
              <Button type="submit" variant="primary">
                <Filter className="h-4 w-4" />
                Apply filters
              </Button>
            </div>
          </div>
        </form>
      </AdminCard>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {kpiCards.map((card) => (
          <KpiCard key={card.label} {...card} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Applications per Month"
          description={`Monthly application volume from the ${datasetLabel.toLowerCase()} dataset.`}
          emptyTitle="No monthly data"
          emptyDescription="Monthly volume appears once applications exist in the selected scope."
          hasData={monthlyData.length > 0}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Applications by Department"
          description="Demand concentration across departments."
          emptyTitle="No department data"
          emptyDescription="Department counts render once jobs and applications are present."
          hasData={departmentData.length > 0}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[0, 999, 999, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Applications by Location"
          description={`Geographic distribution of the ${datasetLabel.toLowerCase()} candidate pipeline.`}
        emptyTitle="No location data"
          emptyDescription={`Location counts appear after ${datasetLabel.toLowerCase()} applications are available.`}
        hasData={locationData.length > 0}
      >
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={locationData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={150} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 999, 999, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <AdminCard title="Recent Applications" description={`Latest ${datasetLabel.toLowerCase()} applications in the selected reporting dataset.`}>
        <div className="overflow-x-auto rounded-[16px] border border-[rgba(15,23,42,0.08)]">
          <table className="min-w-full divide-y divide-[rgba(15,23,42,0.08)]">
            <thead className="bg-slate-50"><tr>{['Candidate', 'Job', 'Location', 'AI Match', 'Applied Date', 'Status'].map((label) => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.08)] bg-white">
              {(analytics?.recent_applications || []).map((item) => <tr key={item.application_id}><td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.candidate_name}</td><td className="px-4 py-3 text-sm text-slate-600">{item.job_title}</td><td className="px-4 py-3 text-sm text-slate-600">{item.location}</td><td className="px-4 py-3 text-sm font-semibold text-blue-700">{formatMetricPercent(item.overall_score || 0)}</td><td className="px-4 py-3 text-sm text-slate-600">{formatDateShort(item.created_at)}</td><td className="px-4 py-3 text-sm font-semibold text-slate-700">{toReadableLabel(item.status)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Applications by Job"
          description="The jobs receiving the most applications."
          emptyTitle="No job data"
          emptyDescription="Job demand appears after applications are submitted."
          hasData={jobData.length > 0}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jobData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={150} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 999, 999, 0]}>
                  {jobData.map((entry, index) => (
                    <Cell key={`job-${entry.label}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Hiring Funnel"
          description="Applications moving through screening, interviews, and hiring."
          emptyTitle="No funnel data"
          emptyDescription="The funnel appears once applications or interviews exist."
          hasData={funnelData.length > 0}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`funnel-${entry.label}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Candidate Status Distribution"
          description={`Current status mix from the ${datasetLabel.toLowerCase()} application pipeline.`}
          emptyTitle="No status data"
          emptyDescription="Statuses appear once the pipeline contains applications."
          hasData={statusPieData.length > 0}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} dataKey="value" nameKey="label" innerRadius={64} outerRadius={110} paddingAngle={4}>
                  {statusPieData.map((entry, index) => (
                    <Cell key={`status-${entry.label}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="AI Match Distribution"
          description="How candidate AI scores are distributed across the pipeline."
          emptyTitle="No AI match data"
          emptyDescription="AI match distribution becomes available once analyses exist."
          hasData={matchData.length > 0}
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]}>
                  {matchData.map((entry, index) => (
                    <Cell key={`match-${entry.label}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <AdminCard title="Top Skills" description="Most frequently detected candidate skills." className="xl:col-span-4">
          <PillList items={topSkills} tone="blue" />
        </AdminCard>
        <AdminCard title="Missing Skills" description="Skills most often absent from candidate profiles." className="xl:col-span-4">
          <PillList items={missingSkills} tone="rose" />
        </AdminCard>
        <AdminCard title="Top Departments" description="Departments with the highest application counts." className="xl:col-span-4">
          <PillList items={topDepartments} tone="emerald" />
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard title="Best Performing Jobs" description="Jobs with the strongest average AI match and hiring momentum.">
          <div className="space-y-3">
            {bestJobs.length ? (
              bestJobs.slice(0, 6).map((job) => (
                <div key={job.label} className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{job.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{job.description || 'Live job performance from the analytics feed.'}</p>
                    </div>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {formatMetricPercent(job.value)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-500">No analysis available yet.</p>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Hardest Jobs to Fill" description="Jobs with weaker AI fit signals or more rejection pressure.">
          <div className="space-y-3">
            {hardestJobs.length ? (
              hardestJobs.slice(0, 6).map((job) => (
                <div key={job.label} className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{job.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{job.description || 'Live job performance from the analytics feed.'}</p>
                    </div>
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      {formatMetricPercent(job.value)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-500">No analysis available yet.</p>
            )}
          </div>
        </AdminCard>
      </div>

      <AdminCard
        title="Reports table"
        description="Generated reports are stored on disk, listed here, and can be downloaded or deleted."
        action={
          <Button type="button" variant="secondary" onClick={() => setRefreshToken((value) => value + 1)} loading={refreshing}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      >
        <div className="overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)]">
          <table className="min-w-full divide-y divide-[rgba(15,23,42,0.08)]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Report Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Created At</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Download</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(15,23,42,0.08)] bg-white">
              {reportRows.length ? (
                reportRows.map((report) => (
                  <tr key={report.report_id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-semibold text-slate-950">{report.report_name}</p>
                        <p className="mt-1 text-sm text-slate-500">{report.source || 'Live report'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{report.created_label}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-[rgba(15,23,42,0.08)] bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                        {report.type_label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(report)}
                        loading={busyAction === report.report_id}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </td>
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(report.report_id)}
                        loading={busyAction === report.report_id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <EmptyReportRow />
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {summary.length ? (
        <AdminCard title="AI analytics summary" description="High-level signals derived from the same live report data.">
          <div className="space-y-3">
            {summary.map((line, index) => (
              <div key={`${index}-${line}`} className="rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {line}
              </div>
            ))}
          </div>
        </AdminCard>
      ) : null}
    </div>
  );
}
