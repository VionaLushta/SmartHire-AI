import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bookmark, BookmarkCheck, BriefcaseBusiness, Building2, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, DollarSign, MapPin, SlidersHorizontal,
  Sparkles, Users,
} from 'lucide-react';
import { fetchJobs, fetchSavedJobs, removeSavedJob, saveJob } from '../../redux/slices/jobSlice';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';
import { formatSalaryRange, formatDateShort } from '../../utils/dashboard';

const PAGE_SIZE = 9;

const DEMO_PROFILES = [
  ['Backend Engineer', 'Engineering', 'Remote', 'Python, FastAPI, Docker, PostgreSQL, AWS'],
  ['Frontend Engineer', 'Engineering', 'Hybrid', 'React, TypeScript, Next.js, CSS, Git'],
  ['Full Stack Developer', 'Engineering', 'New York, NY', 'React, Node.js, PostgreSQL, Docker, Git'],
  ['AI Engineer', 'Artificial Intelligence', 'Remote', 'Python, FastAPI, TensorFlow, AWS, Docker'],
  ['Machine Learning Engineer', 'Artificial Intelligence', 'Boston, MA', 'Python, PyTorch, Machine Learning, SQL'],
  ['Data Engineer', 'Data', 'Hybrid', 'Python, Spark, SQL, Airflow, AWS'],
  ['DevOps Engineer', 'Infrastructure', 'Remote', 'AWS, Kubernetes, Terraform, Docker, Git'],
  ['QA Engineer', 'Quality Assurance', 'Austin, TX', 'Playwright, Python, API Testing, CI/CD'],
  ['UI/UX Designer', 'Design', 'London, UK', 'Figma, UX Research, Prototyping, Design Systems'],
  ['Mobile Developer', 'Engineering', 'Remote', 'React Native, TypeScript, iOS, Android'],
  ['Product Manager', 'Product', 'San Francisco, CA', 'Product Strategy, Analytics, Agile, Jira'],
  ['HR Recruiter', 'People', 'Hybrid', 'Recruiting, ATS, Sourcing, Interviewing'],
];

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.jobs)) return value.jobs;
  return [];
}

function text(value) { return String(value || '').toLowerCase(); }
function label(value, fallback = 'Not specified') { return value || fallback; }
function daysUntil(value) {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  return Number.isFinite(days) ? days : null;
}

function Logo({ job }) {
  const image = job.company_logo_url || job.company_logo || job.logo_url;
  const initials = String(job.company_name || 'SH').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return image ? <img src={image} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">{initials}</div>;
}

function SkeletonCard() {
  return <div className="h-[420px] animate-pulse rounded-3xl border border-slate-200 bg-white p-6"><div className="flex gap-3"><div className="h-12 w-12 rounded-2xl bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-3 w-24 rounded bg-slate-200" /><div className="h-5 w-3/4 rounded bg-slate-200" /></div></div><div className="mt-6 h-4 w-full rounded bg-slate-200" /><div className="mt-3 h-4 w-5/6 rounded bg-slate-200" /><div className="mt-8 h-24 rounded-2xl bg-slate-100" /><div className="mt-8 h-10 rounded-xl bg-slate-200" /></div>;
}

function CompactJobCard({ job, saved, onSave }) {
  const skills = asArray(job.required_skills);
  const visibleSkills = skills.slice(0, 3);
  const additionalSkillCount = Math.max(0, skills.length - visibleSkills.length);
  const workMode = job.work_mode || (job.remote_option ? 'Remote' : 'On-site');

  return (
    <article className="jobs-card group flex min-h-0 flex-col rounded-[20px] border border-slate-200 bg-white p-7 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_20px_42px_rgba(37,99,235,0.14)]">
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <Logo job={job} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-500">{label(job.company_name, 'Hiring company')}</p>
            <h2 className="mt-1 line-clamp-2 text-[28px] font-bold leading-[1.05] tracking-[-0.055em] text-slate-950">{label(job.title, 'Open position')}</h2>
          </div>
        </div>
        <button type="button" aria-label={saved ? 'Remove saved job' : 'Save job'} onClick={onSave} className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600">
          {saved ? <BookmarkCheck className="h-5 w-5 text-blue-600" /> : <Bookmark className="h-5 w-5" />}
        </button>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-x-5 gap-y-4 text-[14px] font-medium text-slate-600 sm:grid-cols-3">
        <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-500" />{label(job.location)}</span>
        <span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-500" />{workMode}</span>
        <span className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-blue-500" />{label(job.employment_type)}</span>
        <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" />{label(job.experience_level)}</span>
        <span className="flex items-center gap-2 sm:col-span-2"><DollarSign className="h-4 w-4 text-blue-500" />{formatSalaryRange(job)}</span>
      </div>

      <p className="mt-7 line-clamp-2 text-[15px] leading-6 text-slate-600">{label(job.description, 'No description provided.')}</p>

      {visibleSkills.length ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {visibleSkills.map((skill) => <span key={skill} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[13px] font-semibold text-blue-700">{skill}</span>)}
          {additionalSkillCount ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[13px] font-semibold text-slate-500">+{additionalSkillCount} more</span> : null}
        </div>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Button as={Link} to={`/jobs/${job.job_id}`} variant="secondary" size="md" className="h-11 flex-1 text-[15px]">View Details</Button>
        <Button as={Link} to={`/jobs/${job.job_id}/apply`} variant="primary" size="md" className="h-11 flex-1 text-[15px]">Apply Now <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </article>
  );
}

function LegacyJobCard({ job, saved, onSave, showAiMatch }) {
  const deadlineDays = daysUntil(job.deadline);
  const isNew = job.created_at && (Date.now() - new Date(job.created_at).getTime()) < 7 * 86400000;
  const skills = asArray(job.required_skills).slice(0, 5);
  const status = text(job.status);
  const statuses = [
    status === 'urgent' && 'Urgent',
    job.remote_option && 'Remote',
    status === 'internship' && 'Internship',
    isNew && 'New',
    deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7 && 'Closing soon',
  ].filter(Boolean);
  return <article className="jobs-card group flex min-h-[470px] flex-col rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_22px_45px_rgba(15,23,42,0.11)]">
    {job.featured ? <div className="mb-4 inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">★ Featured</div> : null}
    <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-4"><Logo job={job} /><div className="min-w-0"><p className="truncate text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label(job.company_name, 'Hiring company')}</p><h2 className="mt-2 line-clamp-2 text-xl font-bold leading-tight tracking-[-0.04em] text-slate-950">{label(job.title, 'Open position')}</h2>{job.company_verified ? <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-blue-600"><CheckCircle2 className="h-3.5 w-3.5" /> Verified company</p> : null}</div></div><button type="button" aria-label={saved ? 'Remove saved job' : 'Save job'} onClick={onSave} className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600">{saved ? <BookmarkCheck className="h-5 w-5 text-blue-600" /> : <Bookmark className="h-5 w-5" />}</button></div>
    {statuses.length || showAiMatch ? <div className="mt-4 flex flex-wrap gap-1.5">{showAiMatch ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700"><Sparkles className="mr-1 inline h-3 w-3" />AI Match {job.ai_match_score ?? job.match_score ?? 'Available'}</span> : null}{statuses.map((item) => <span key={item} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item === 'Urgent' ? 'bg-rose-50 text-rose-700' : item === 'Featured' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{item}</span>)}</div> : null}
    <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-600"><span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{label(job.location)}</span><span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-3.5 w-3.5 text-slate-400" />{label(job.employment_type)}</span><span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-slate-400" />{label(job.experience_level)}</span><span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-slate-400" />{formatSalaryRange(job)}</span></div>
    <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">{label(job.description, 'No description provided.')}</p>
    {skills.length ? <div className="mt-4 flex flex-wrap gap-1.5">{skills.map((skill) => <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{skill}</span>)}</div> : null}
    <div className="mt-auto pt-5"><div className="mb-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-500"><span><Users className="mr-1 inline h-3.5 w-3.5" />{job.applicants_count ?? job.applicants ?? 0} applicants</span><span>{job.views_count ?? job.views ?? 0} views</span><span>{job.saved_count ?? job.saves ?? 0} saved</span></div><div className="mb-4 flex items-center justify-between text-[11px] font-semibold text-slate-400"><span>Posted {formatDateShort(job.created_at || job.updated_at)}</span><span>{job.deadline ? `Deadline ${formatDateShort(job.deadline)}` : 'No deadline'}</span></div><div className="flex gap-2"><Button as={Link} to={`/jobs/${job.job_id}`} variant="secondary" size="sm" className="flex-1">View Details</Button><Button as={Link} to={`/jobs/${job.job_id}/apply`} variant="primary" size="sm" className="flex-1">Apply <ArrowRight className="h-3.5 w-3.5" /></Button></div></div>
  </article>;
}

export default function JobsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const state = useSelector((store) => store.jobs);
  const jobs = useMemo(() => asArray(state.items), [state.items]);
  const savedJobs = useMemo(() => asArray(state.savedJobs), [state.savedJobs]);
  const [filters, setFilters] = useState({ department: 'all', company: 'all', location: 'all', employment: 'all', experience: 'all', workMode: 'all', salary: 'all', status: 'all', sort: 'recent' });
  const [page, setPage] = useState(1);
  const [savingJobId, setSavingJobId] = useState(null);

  useEffect(() => {
    dispatch(fetchJobs());
    if (String(user?.role_name || user?.role).toLowerCase() === 'candidate') dispatch(fetchSavedJobs());

    const refreshJobs = () => dispatch(fetchJobs());
    window.addEventListener('departments:changed', refreshJobs);
    window.addEventListener('jobs:changed', refreshJobs);
    return () => {
      window.removeEventListener('departments:changed', refreshJobs);
      window.removeEventListener('jobs:changed', refreshJobs);
    };
  }, [dispatch, user?.role, user?.role_name]);
  useEffect(() => { setPage(1); }, [filters]);

  const publicJobs = useMemo(() => {
    const liveJobs = jobs.filter((job) => {
      const status = text(job.status);
      return ['active', 'open', 'published'].includes(status) || job.is_public === true || job.is_active === true;
    });
    if (!liveJobs.length || liveJobs.length >= DEMO_PROFILES.length) return liveJobs;
    return DEMO_PROFILES.map(([title, department, location, skillText], index) => {
      const source = liveJobs[index % liveJobs.length];
      return {
        ...source,
        display_id: `${source.job_id || 'job'}-demo-${index}`,
        title,
        department_name: department,
        location,
        employment_type: index % 4 === 0 ? 'Contract' : 'Full-time',
        experience_level: index % 3 === 0 ? 'Senior' : index % 3 === 1 ? 'Mid-level' : 'Entry-level',
        required_skills: skillText.split(', '),
        description: `Join SmartHire AI as a ${title} and help build the future of intelligent hiring.`,
        featured: index < 3,
        demo_source_id: source.job_id,
      };
    });
  }, [jobs]);
  const options = useMemo(() => ({
    department: [...new Set(publicJobs.map((j) => j.department_name).filter(Boolean))],
    company: [...new Set(publicJobs.map((j) => j.company_name).filter(Boolean))],
    location: [...new Set(publicJobs.map((j) => j.location).filter(Boolean))],
    employment: [...new Set(publicJobs.map((j) => j.employment_type).filter(Boolean))],
    experience: [...new Set(publicJobs.map((j) => j.experience_level).filter(Boolean))],
  }), [publicJobs]);
  const filtered = useMemo(() => {
    const result = publicJobs.filter((job) => {
      const salary = Number(job.salary_max ?? job.salary_min ?? 0);
      const matchesSalary = filters.salary === 'all' || (filters.salary === 'under50' ? salary < 50000 : filters.salary === '50to100' ? salary >= 50000 && salary <= 100000 : salary > 100000);
      const matchesMode = filters.workMode === 'all' || (filters.workMode === 'remote' ? job.remote_option : text(job.location).includes(filters.workMode));
      return (filters.department === 'all' || text(job.department_name) === filters.department) && (filters.company === 'all' || text(job.company_name) === filters.company) && (filters.location === 'all' || text(job.location) === filters.location) && (filters.employment === 'all' || text(job.employment_type) === filters.employment) && (filters.experience === 'all' || text(job.experience_level) === filters.experience) && matchesMode && matchesSalary && (filters.status === 'all' || text(job.status) === filters.status);
    }).sort((a, b) => filters.sort === 'salary' ? Number(b.salary_max || 0) - Number(a.salary_max || 0) : filters.sort === 'deadline' ? new Date(a.deadline || '9999').getTime() - new Date(b.deadline || '9999').getTime() : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return result;
  }, [filters, publicJobs]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageJobs = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeFilters = Object.entries(filters).filter(([key, value]) => value !== 'all' && key !== 'sort');
  const isCandidateUser = String(user?.role_name || user?.role).toLowerCase() === 'candidate';
  const stats = { open: publicJobs.length, companies: new Set(publicJobs.map((j) => j.company_name).filter(Boolean)).size, departments: new Set(publicJobs.map((j) => j.department_name).filter(Boolean)).size, applications: publicJobs.reduce((sum, j) => sum + Number(j.applicants_count || j.applicants || 0), 0) };
  const clearFilters = () => { setFilters({ department: 'all', company: 'all', location: 'all', employment: 'all', experience: 'all', workMode: 'all', salary: 'all', status: 'all', sort: 'recent' }); };
  const isSaved = (id) => savedJobs.some((item) => String(item.job_id) === String(id));
  const toggleSave = async (job) => {
    if (!isCandidateUser) {
      navigate(`/candidate/login?returnTo=${encodeURIComponent('/jobs')}`);
      return;
    }
    if (!job.job_id || savingJobId === job.job_id) return;
    const saved = savedJobs.find((item) => String(item.job_id) === String(job.job_id));
    setSavingJobId(job.job_id);
    try {
      await dispatch(saved ? removeSavedJob(job.job_id) : saveJob(job.job_id)).unwrap();
    } catch {
      // The global API interceptor logs the server error; keep the current saved state unchanged.
    } finally {
      setSavingJobId(null);
    }
  };
  const select = (key, title, values) => <select value={filters[key]} onChange={(e) => setFilters((current) => ({ ...current, [key]: e.target.value }))} className="box-border h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-blue-200 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100" aria-label={title}><option value="all">{title}</option>{values.map((item) => <option key={item} value={text(item)}>{item}</option>)}</select>;

  return (
    <div className="jobs-page min-h-screen bg-[#f6f8fb] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="jobs-hero relative overflow-hidden rounded-[28px] border border-blue-100 bg-white px-6 py-10 shadow-[0_24px_65px_rgba(37,99,235,0.14)] sm:px-10 lg:py-12">
          <div className="jobs-hero-glow pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="jobs-hero-copy">
              <p className="jobs-hero-kicker text-xs font-bold uppercase tracking-[0.3em] text-blue-600">SmartHire AI marketplace</p>
              <h1 className="jobs-hero-title mt-4 max-w-2xl text-4xl font-bold tracking-[-0.06em] text-slate-950 sm:text-6xl">Find your next opportunity.</h1>
              <p className="jobs-hero-description mt-5 max-w-xl text-base leading-7 text-slate-600">Discover AI-powered career opportunities from top companies.</p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[[BriefcaseBusiness, 'Open Jobs', stats.open, 'text-blue-600', 'bg-blue-50'], [Building2, 'Companies', stats.companies, 'text-violet-600', 'bg-violet-50'], [SlidersHorizontal, 'Departments', stats.departments, 'text-emerald-600', 'bg-emerald-50'], [Users, 'Applications', stats.applications, 'text-amber-600', 'bg-amber-50']].map(([Icon, name, value, iconColor, iconBg], index) => <div key={name} className="jobs-stat-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ '--jobs-delay': `${index * 90}ms` }}><span className={`jobs-stat-icon inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBg} ${iconColor}`}><Icon className="h-4 w-4" /></span><p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{name}</p></div>)}
              </div>
            </div>
            <div className="jobs-hero-visual relative mx-auto flex min-h-[250px] w-full max-w-md items-center justify-center overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-br from-[#0f172a] via-[#172554] to-[#2563eb] p-6 shadow-[0_24px_45px_rgba(15,23,42,0.22)]">
              <div className="jobs-hero-orb absolute h-44 w-44 rounded-full bg-blue-200/50 blur-2xl" />
              <div className="jobs-preview relative w-full max-w-[270px] rotate-[-3deg] rounded-2xl border border-white/70 bg-white p-5 shadow-[0_18px_35px_rgba(2,6,23,0.24)]"><div className="flex items-center gap-3"><div className="jobs-preview-icon flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white"><Sparkles className="h-5 w-5" /></div><div className="flex-1 space-y-2"><div className="jobs-shimmer h-2.5 w-24 rounded-full bg-slate-200" /><div className="jobs-shimmer h-2 w-16 rounded-full bg-blue-100" /></div></div><div className="mt-5 space-y-3"><div className="rounded-xl bg-blue-50 p-3"><div className="jobs-shimmer h-2 w-28 rounded-full bg-blue-200" /><div className="jobs-shimmer mt-2 h-2 w-40 rounded-full bg-white" /></div><div className="flex gap-2"><span className="h-7 flex-1 rounded-lg bg-slate-100" /><span className="h-7 w-16 rounded-lg bg-emerald-100" /></div></div></div>
              <span className="jobs-preview-pill absolute right-8 top-8 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-md">98% match</span><span className="jobs-preview-pill jobs-preview-pill-delayed absolute bottom-8 left-8 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-md">AI screened</span>
            </div>
          </div>
        </section>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <main className="min-w-0 space-y-5">
            <section className="jobs-filters overflow-hidden rounded-[20px] border border-white/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.09)] backdrop-blur-sm">
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(170px,1fr))] min-[1440px]:grid-cols-[2fr_repeat(8,minmax(140px,1fr))]">
                <div className="h-0" aria-hidden="true" />
                {select('department', 'Department', options.department)}{select('company', 'Company', options.company)}{select('location', 'Location', options.location)}{select('employment', 'Employment type', options.employment)}{select('experience', 'Experience', options.experience)}{select('workMode', 'Work mode', ['remote', 'hybrid', 'on-site'])}
                <select value={filters.salary} onChange={(e) => setFilters((c) => ({ ...c, salary: e.target.value }))} className="box-border h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm transition hover:border-blue-200 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="all">Any salary</option><option value="under50">Under $50k</option><option value="50to100">$50k-$100k</option><option value="over100">$100k+</option></select>
                <select value={filters.sort} onChange={(e) => setFilters((c) => ({ ...c, sort: e.target.value }))} className="box-border h-14 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-3 text-sm transition hover:border-blue-200 hover:shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="recent">Sort: Recent</option><option value="salary">Sort: Salary</option><option value="deadline">Sort: Deadline</option></select>
              </div>
              {activeFilters.length ? <div className="mt-3 flex flex-wrap items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-400" />{activeFilters.map(([key, value]) => <span key={key} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{key}: {value}</span>)}<button type="button" onClick={clearFilters} className="ml-auto text-xs font-bold text-blue-600 hover:underline">Clear filters</button></div> : null}
            </section>
            <div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Open roles</p><h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-950">{filtered.length} opportunities</h2></div><p className="text-sm text-slate-500">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p></div>
            {state.status === 'loading' && !jobs.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">{[1, 2, 3, 4, 5, 6].map((item) => <SkeletonCard key={item} />)}</div> : state.error && !jobs.length ? <ErrorState title="Unable to load jobs" description={state.error} onRetry={() => dispatch(fetchJobs())} /> : pageJobs.length ? <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-2">{pageJobs.map((job) => <CompactJobCard key={job.display_id || job.job_id} job={job} saved={isSaved(job.job_id)} onSave={() => toggleSave(job)} />)}</div> : <EmptyState title="No jobs available" description="Try changing your search or filters. New opportunities will appear here when companies publish them." action={<Button as={Link} to="/candidate/register" variant="primary">Create Job Alert</Button>} />}
            {pageCount > 1 ? <nav className="flex items-center justify-center gap-2 pt-3" aria-label="Jobs pagination"><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" />Previous</Button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => <button type="button" key={number} onClick={() => setPage(number)} className={`h-9 w-9 rounded-xl text-sm font-bold ${number === page ? 'bg-slate-950 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{number}</button>)}<Button size="sm" variant="secondary" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next<ChevronRight className="h-4 w-4" /></Button></nav> : null}
          </main>
          <aside className="jobs-sidebar hidden space-y-4 xl:block">
            <div className="jobs-side-card rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Top Companies</h3><div className="mt-4 space-y-3">{options.company.slice(0, 5).map((item) => <p key={item} className="flex items-center gap-2 text-sm text-slate-600"><Building2 className="h-4 w-4 text-blue-600" />{item}</p>)}{!options.company.length ? <p className="text-sm text-slate-500">No company data available.</p> : null}</div></div>
            <div className="jobs-side-card rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Popular Skills</h3><div className="mt-4 flex flex-wrap gap-2">{[...new Set(publicJobs.flatMap((job) => asArray(job.required_skills)))].slice(0, 12).map((skill) => <span key={skill} className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{skill}</span>)}</div></div>
            <div className="jobs-side-card rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Recently Posted</h3><div className="mt-4 space-y-3">{publicJobs.slice(0, 4).map((job) => <Link key={job.job_id} to={`/jobs/${job.job_id}`} className="block text-sm font-semibold text-slate-700 hover:text-blue-600"><Clock3 className="mr-2 inline h-3.5 w-3.5 text-blue-600" />{job.title}</Link>)}</div></div>
            <div className="jobs-career-card rounded-2xl bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#06b6d4] p-5 text-white shadow-[0_18px_35px_rgba(37,99,235,0.22)]"><h3 className="font-bold">Career Tips</h3><p className="mt-2 text-sm leading-6 text-blue-50">Keep your resume current and tailor your skills to each role.</p></div>
          </aside>
        </div>
      </div>
    </div>
  );
}
