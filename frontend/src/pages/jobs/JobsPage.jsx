import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Grid2x2, List, SlidersHorizontal } from 'lucide-react';
import { applyToJob, fetchJobs, fetchSavedJobs, removeSavedJob, saveJob } from '../../redux/slices/jobSlice';
import JobCard from '../../components/jobs/JobCard';
import SearchBar from '../../components/jobs/SearchBar';
import JobFilters from '../../components/jobs/JobFilters';
import Pagination from '../../components/jobs/Pagination';
import LoadingState from '../../components/jobs/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import Button from '../../components/ui/Button';
import ApplyModal from '../../components/jobs/ApplyModal';
import ErrorState from '../../components/ui/ErrorState';

const defaultFilters = {
  category: '',
  department: '',
  employment_type: '',
  experience_level: '',
  remote_option: '',
  salary_band: '',
};

const categorySeeds = ['Product', 'Engineering', 'Design', 'Operations', 'Marketing'];
const departmentSeeds = ['Engineering', 'Design', 'People', 'Marketing', 'Operations'];

export default function JobsPage() {
  const dispatch = useDispatch();
  const { items, savedJobs, status, error } = useSelector((state) => state.jobs);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchJobs());
    dispatch(fetchSavedJobs());
  }, [dispatch]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((job) => {
      const haystack = [
        job.title,
        job.company_name,
        job.location,
        job.department_name,
        (job.required_skills || []).join(' '),
        (job.skill_names || []).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (query && !haystack.includes(query)) {
        return false;
      }

      if (filters.category && !(job.category_ids || []).includes(Number(filters.category))) {
        return false;
      }

      if (filters.department && job.department_name !== filters.department) {
        return false;
      }

      if (filters.employment_type && job.employment_type !== filters.employment_type) {
        return false;
      }

      if (filters.experience_level && job.experience_level !== filters.experience_level) {
        return false;
      }

      if (filters.remote_option) {
        const expected = filters.remote_option.toLowerCase();
        const location = String(job.location || '').toLowerCase();
        if (expected === 'remote' && !location.includes('remote')) return false;
        if (expected === 'hybrid' && !location.includes('hybrid')) return false;
        if (expected === 'on-site' && !location.includes('on-site') && !location.includes('office')) return false;
      }

      if (filters.salary_band) {
        const [min, max] = filters.salary_band.split('-').map(Number);
        const low = Number(job.salary_min || 0);
        if (Number.isFinite(min) && low < min) return false;
        if (Number.isFinite(max) && low > max) return false;
      }

      return true;
    });
  }, [filters, items, search]);

  const currentPageItems = filteredJobs.slice((page - 1) * 6, page * 6);

  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  const savedJobIds = new Set(savedJobs.map((job) => String(job.job_id ?? job.job?.job_id ?? '')));

  async function handleSave(job) {
    const jobId = Number(job.job_id ?? job.id);
    const isSaved = savedJobIds.has(String(jobId));
    if (isSaved) {
      dispatch(removeSavedJob(jobId));
      return;
    }
    dispatch(saveJob(jobId));
  }

  async function handleApply(job) {
    setSelectedJob(job);
  }

  async function confirmApply() {
    if (!selectedJob) return;
    setApplyingJobId(Number(selectedJob.job_id));
    await dispatch(applyToJob(selectedJob.job_id));
    setApplyingJobId(null);
    setSelectedJob(null);
  }

  if (status === 'loading' && items.length === 0) {
    return <LoadingState title="Loading jobs..." description="Fetching opportunities and filters from the backend." />;
  }

  if (error && items.length === 0) {
    return (
      <ErrorState
        title="Unable to load jobs"
        description={error}
        onRetry={() => {
          dispatch(fetchJobs());
          dispatch(fetchSavedJobs());
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Talent marketplace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Explore opportunities</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button as={Link} to="/jobs/new" variant="primary" className="hidden md:inline-flex">
            Post a role
          </Button>
          <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-xl p-2 ${viewMode === 'grid' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
              aria-label="Use grid view"
            >
              <Grid2x2 className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-xl p-2 ${viewMode === 'list' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
              aria-label="Use list view"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <JobFilters
          filters={filters}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          categories={categorySeeds.map((name, index) => ({ category_id: index + 1, name }))}
          departments={departmentSeeds.map((name, index) => ({ department_id: index + 1, name }))}
          onReset={() => {
            setFilters(defaultFilters);
            setSearch('');
          }}
        />

        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 sm:flex">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {filteredJobs.length} results
            </div>
          </div>

          {currentPageItems.length === 0 ? (
            <EmptyState
              title="No roles match your filters"
              description="Try broadening the search terms or clearing filters to see more opportunities."
              action={(
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setFilters(defaultFilters);
                    setSearch('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            />
          ) : (
            <div className={viewMode === 'grid' ? 'grid gap-5 xl:grid-cols-2' : 'space-y-4'}>
              {currentPageItems.map((job) => (
                <JobCard
                  key={job.job_id}
                  job={job}
                  isSaved={savedJobIds.has(String(job.job_id))}
                  onSave={handleSave}
                  onApply={handleApply}
                />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={Math.max(1, Math.ceil(filteredJobs.length / 6))} onPageChange={setPage} />
        </div>
      </div>

      <ApplyModal
        open={Boolean(selectedJob)}
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onConfirm={confirmApply}
        submitting={Boolean(applyingJobId)}
      />
    </div>
  );
}
