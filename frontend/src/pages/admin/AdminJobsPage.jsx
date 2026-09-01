import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Plus, Search, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNotifications } from '../../context/NotificationContext';
import {
  createJob,
  deleteJob,
  fetchJobs,
  updateJob,
} from '../../redux/slices/jobSlice';
import { companyService } from '../../services/companyService';
import { departmentService } from '../../services/departmentService';
import { jobCategoryService } from '../../services/jobCategoryService';
import { jobService } from '../../services/jobService';
import { jobSkillService } from '../../services/jobSkillService';
import { unwrapItems } from '../../utils/dashboard';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import DeleteModal from '../../components/jobs/DeleteModal';
import JobForm from '../../components/jobs/JobForm';
import SkillLibraryPicker from '../../components/admin/SkillLibraryPicker';

function isPublished(status) {
  return ['active', 'open'].includes(String(status || '').toLowerCase());
}

function getInitialJobForm(job) {
  if (!job) {
    return null;
  }

  return {
    ...job,
    department_id: job.department_id ?? '',
    category_ids: Array.isArray(job.category_ids) ? job.category_ids.join(', ') : '',
    salary_min: job.salary_min ?? '',
    salary_max: job.salary_max ?? '',
    deadline: job.deadline ? String(job.deadline).split('T')[0] : '',
    description: job.description || '',
    requirements: job.requirements || '',
    responsibilities: job.responsibilities || '',
  };
}

export default function AdminJobsPage() {
  const dispatch = useDispatch();
  const { success } = useNotifications();
  const { items: jobs } = useSelector((state) => state.jobs);
  const [query, setQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [skillJobs, setSkillJobs] = useState([]);
  const [skillLibrary, setSkillLibrary] = useState([]);
  const [skillGroups, setSkillGroups] = useState({ required_skills: [], optional_skills: [] });
  const [skillForm, setSkillForm] = useState({
    name: '',
    category: '',
    is_required: true,
    source: 'library',
  });
  const [skillQuery, setSkillQuery] = useState('');
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [skillMessage, setSkillMessage] = useState('');
  const [skillError, setSkillError] = useState('');
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillDeletingId, setSkillDeletingId] = useState(null);
  const [skillDeleteOpen, setSkillDeleteOpen] = useState(false);
  const [skillPendingDelete, setSkillPendingDelete] = useState(null);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [jobModalMode, setJobModalMode] = useState('create');
  const [jobFormVersion, setJobFormVersion] = useState(0);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [jobError, setJobError] = useState('');
  const [savingJob, setSavingJob] = useState(false);
  const [deletingJob, setDeletingJob] = useState(false);
  const [jobDeleteOpen, setJobDeleteOpen] = useState(false);
  const [activeJob, setActiveJob] = useState(null);

  async function loadSkillJobs() {
    try {
      const collected = [];
      let page = 1;
      let totalPages = 1;
      do {
        const response = await jobService.list({ page, page_size: 100 });
        const payload = response.data || {};
        collected.push(...unwrapItems(response));
        totalPages = Math.max(1, payload.total_pages || 1);
        page += 1;
      } while (page <= totalPages);
      setSkillJobs(collected);
    } catch {
      setSkillJobs([]);
    }
  }

  async function loadSkillLibrary() {
    try {
      const response = await jobSkillService.library();
      const payload = response.data || {};
      setSkillLibrary(Array.isArray(payload.categories) ? payload.categories : []);
    } catch {
      setSkillLibrary([]);
    }
  }

  useEffect(() => {
    dispatch(fetchJobs());
  }, [dispatch]);

  useEffect(() => {
    loadSkillJobs();
  }, []);

  useEffect(() => {
    loadSkillLibrary();
  }, []);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [companyResponse, departmentResponse, categoryResponse] = await Promise.all([
          companyService.list(),
          departmentService.list({ page_size: 100 }),
          jobCategoryService.list({ page_size: 100 }),
        ]);

        setCompanies(unwrapItems(companyResponse));
        setDepartments(unwrapItems(departmentResponse));
        setCategories(unwrapItems(categoryResponse));
      } catch {
        setCompanies([]);
        setDepartments([]);
        setCategories([]);
      }
    }

    loadMetadata();
  }, []);

  const activeSkillJobs = useMemo(() => {
    const source = skillJobs.length ? skillJobs : jobs;
    return source.filter((job) => isPublished(job.status));
  }, [jobs, skillJobs]);

  useEffect(() => {
    if (!activeSkillJobs.length) {
      if (selectedJobId) {
        setSelectedJobId('');
      }
      return;
    }

    const currentExists = activeSkillJobs.some(
      (job) => String(job.job_id) === String(selectedJobId),
    );
    if (!selectedJobId || !currentExists) {
      setSelectedJobId(String(activeSkillJobs[0].job_id));
    }
  }, [activeSkillJobs, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) {
      setSkillGroups({ required_skills: [], optional_skills: [] });
      resetSkillForm();
      return;
    }
    resetSkillForm();
    setSkillMessage('');
    setSkillError('');
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) return;
    refreshSkills({ silent: true }).catch(() => null);
  }, [selectedJobId]);

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) =>
      `${job.title} ${job.company_name} ${job.location} ${job.department_name}`.toLowerCase().includes(term),
    );
  }, [jobs, query]);

  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.job_id) === String(selectedJobId)) || null,
    [jobs, selectedJobId],
  );

  const allSkills = useMemo(
    () => [...skillGroups.required_skills, ...skillGroups.optional_skills],
    [skillGroups],
  );

  const filteredSkills = useMemo(() => {
    const term = skillQuery.trim().toLowerCase();
    if (!term) return allSkills;
    return allSkills.filter((skill) =>
      `${skill.name || ''} ${skill.category || ''}`.toLowerCase().includes(term),
    );
  }, [allSkills, skillQuery]);

  const availableDepartments = useMemo(() => {
    if (!selectedCompanyId) {
      return departments;
    }
    return departments.filter((department) => String(department.company_id) === String(selectedCompanyId));
  }, [departments, selectedCompanyId]);

  const selectedCompanyName = useMemo(() => {
    const match = companies.find((company) => String(company.company_id) === String(selectedCompanyId));
    return match?.name || 'Select a company';
  }, [companies, selectedCompanyId]);

  function resetSkillForm() {
    setSkillForm({
      name: '',
      category: '',
      is_required: true,
      source: 'library',
    });
    setEditingSkillId(null);
  }

  async function refreshSkills({ silent = false } = {}) {
    if (!selectedJobId) return;
    try {
      const response = await jobSkillService.list(selectedJobId);
      const payload = response.data || {};
      setSkillGroups({
        required_skills: payload.required_skills || [],
        optional_skills: payload.optional_skills || [],
      });
      setSkillError('');
      return response;
    } catch (error) {
      const message = error?.response?.data?.detail || error?.message || 'Unable to load skills.';
      setSkillGroups({ required_skills: [], optional_skills: [] });
      setSkillError(message);
      if (!silent) {
        throw error;
      }
      return null;
    }
  }

  function openCreateJob() {
    setJobError('');
    setActiveJob(null);
    setJobModalMode('create');
    setSelectedCompanyId(
      String(companies[0]?.company_id ?? selectedJob?.company_id ?? jobs[0]?.company_id ?? 1),
    );
    setJobModalOpen(true);
    setJobFormVersion((value) => value + 1);
  }

  function openEditJob(job) {
    setJobError('');
    setActiveJob(job);
    setJobModalMode('edit');
    setSelectedCompanyId(String(job.company_id ?? companies[0]?.company_id ?? 1));
    setJobModalOpen(true);
    setJobFormVersion((value) => value + 1);
  }

  function openDeleteJob(job) {
    setJobError('');
    setActiveJob(job);
    setJobDeleteOpen(true);
  }

  async function handleJobSubmit(payload) {
    setJobError('');
    try {
      setSavingJob(true);
      if (jobModalMode === 'edit' && activeJob?.job_id != null) {
        await dispatch(
          updateJob({
            jobId: activeJob.job_id,
            payload,
          }),
        ).unwrap();
        success('Job updated', `${payload.title || 'The job'} was saved successfully.`);
        setSelectedJobId(String(activeJob.job_id));
      } else {
        const created = await dispatch(createJob(payload)).unwrap();
        success('Job created', `${created?.title || payload.title || 'The job'} is now live.`);
        if (created?.job_id) {
          setSelectedJobId(String(created.job_id));
        }
      }
      await loadSkillJobs().catch(() => null);
      setJobModalOpen(false);
      setActiveJob(null);
      await refreshSkills().catch(() => null);
    } catch (error) {
      setJobError(error || 'Unable to save job.');
    } finally {
      setSavingJob(false);
    }
  }

  async function handleJobDelete() {
    if (!activeJob) return;
    try {
      setDeletingJob(true);
      await dispatch(deleteJob(activeJob.job_id)).unwrap();
      success('Job deleted', `${activeJob.title || 'The job'} was removed successfully.`);
      setJobDeleteOpen(false);
      setActiveJob(null);
      await loadSkillJobs().catch(() => null);
      if (String(selectedJobId) === String(activeJob.job_id)) {
        const nextJob = jobs.find((job) => String(job.job_id) !== String(activeJob.job_id));
        setSelectedJobId(nextJob ? String(nextJob.job_id) : '');
      }
    } catch (error) {
      setJobError(error || 'Unable to delete job.');
    } finally {
      setDeletingJob(false);
    }
  }

  async function handleTogglePublish(job) {
    try {
      await dispatch(
        updateJob({
          jobId: job.job_id,
          payload: { status: isPublished(job.status) ? 'closed' : 'open' },
        }),
      ).unwrap();
      success(
        isPublished(job.status) ? 'Job unpublished' : 'Job published',
        `${job.title || 'The role'} was updated successfully.`,
      );
      await loadSkillJobs().catch(() => null);
    } catch (error) {
      setJobError(error || 'Unable to update job status.');
    }
  }

  async function handleSubmitSkill(event) {
    event.preventDefault();
    setSkillMessage('');
    setSkillError('');
    if (!selectedJobId) {
      setSkillError('Select a job first.');
      return;
    }
    if (!skillForm.name.trim()) {
      setSkillError('Skill name is required.');
      return;
    }
    if (!skillForm.category.trim() && skillForm.source === 'custom') {
      setSkillError('Skill category is required.');
      return;
    }
    if (!skillForm.category.trim() && skillForm.source !== 'custom') {
      setSkillError('Select a predefined skill or create a custom skill.');
      return;
    }
    try {
      setSkillSaving(true);
      if (editingSkillId) {
        await jobSkillService.update(selectedJobId, editingSkillId, {
          name: skillForm.name.trim(),
          category: skillForm.category.trim(),
          is_required: skillForm.is_required,
        });
        setSkillMessage('Skill updated successfully.');
        success('Skill updated', `${skillForm.name.trim()} was updated for this job.`);
      } else {
        await jobSkillService.create(selectedJobId, {
          name: skillForm.name.trim(),
          category: skillForm.category.trim(),
          is_required: skillForm.is_required,
        });
        setSkillMessage('Skill added successfully.');
        success('Skill added', `${skillForm.name.trim()} is now linked to this job.`);
      }
      await refreshSkills().catch(() => null);
      await loadSkillLibrary().catch(() => null);
      resetSkillForm();
    } catch (error) {
      setSkillError(error?.response?.data?.detail || 'Unable to save skill.');
    } finally {
      setSkillSaving(false);
    }
  }

  function openDeleteSkill(skill) {
    setSkillMessage('');
    setSkillError('');
    setSkillPendingDelete(skill);
    setSkillDeleteOpen(true);
  }

  async function handleConfirmDeleteSkill() {
    if (!selectedJobId || !skillPendingDelete) return;
    try {
      setSkillDeletingId(skillPendingDelete.skill_id);
      await jobSkillService.remove(selectedJobId, skillPendingDelete.skill_id);
      await refreshSkills().catch(() => null);
      setSkillMessage(`${skillPendingDelete.name} removed.`);
      success('Skill removed', `${skillPendingDelete.name} was removed from this job.`);
      if (String(editingSkillId) === String(skillPendingDelete.skill_id)) {
        resetSkillForm();
      }
      setSkillDeleteOpen(false);
      setSkillPendingDelete(null);
    } catch (error) {
      setSkillError(error?.response?.data?.detail || 'Unable to remove skill.');
    } finally {
      setSkillDeletingId(null);
    }
  }

  function handleEditSkill(skill) {
    setSkillMessage('');
    setSkillError('');
    setEditingSkillId(skill.skill_id);
    const inLibrary = skillLibrary.some((group) =>
      (group.skills || []).some((librarySkill) => librarySkill.name?.toLowerCase() === skill.name?.toLowerCase()),
    );
    setSkillForm({
      name: skill.name || '',
      category: skill.category || '',
      is_required: Boolean(skill.is_required),
      source: inLibrary ? 'library' : 'custom',
    });
  }

  const jobModalInitialValues = useMemo(
    () => (jobModalMode === 'edit' ? getInitialJobForm(activeJob) : null),
    [activeJob, jobModalMode],
  );

  return (
    <div className="space-y-6">
      <AdminCard
        title="Jobs management"
        description="Manage the organization's job inventory and posting lifecycle."
      >
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              aria-label="Search jobs"
              placeholder="Search jobs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Button variant="primary" type="button" onClick={openCreateJob}>
            Create job
          </Button>
        </div>

        {filteredJobs.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Company
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredJobs.map((job) => {
                  const published = isPublished(job.status);
                  return (
                    <tr
                      key={job.job_id}
                      className={`cursor-pointer hover:bg-slate-50 ${
                        String(job.job_id) === String(selectedJobId) ? 'bg-slate-50' : ''
                      }`}
                      onClick={() => setSelectedJobId(String(job.job_id))}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{job.title}</p>
                          <p className="text-sm text-slate-500">
                            {job.location || 'Remote'} - {job.employment_type || 'Full-time'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{job.company_name}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={job.status || 'open'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditJob(job);
                            }}
                          >
                            <Pencil className="mr-1.5 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={async (event) => {
                              event.stopPropagation();
                              await handleTogglePublish(job);
                            }}
                          >
                            {published ? (
                              <>
                                <Archive className="mr-1.5 h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="mr-1.5 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteJob(job);
                            }}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No jobs match your search"
            description="Try another keyword to find a role."
          />
        )}
      </AdminCard>

      <AdminCard
        title="Job Skills Management"
        description="Define required and optional skills for AI-assisted candidate evaluation."
      >
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="job-skill-job">
                Active job
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Skills are always attached to one live job.
              </p>
            </div>
            <select
              id="job-skill-job"
              className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-3 text-[15px] text-slate-700 outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              <option value="">Select a job</option>
              {activeSkillJobs.map((job) => (
                <option key={job.job_id} value={job.job_id}>
                  {job.title} - {job.company_name}
                </option>
              ))}
            </select>

            <form onSubmit={handleSubmitSkill} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <SkillLibraryPicker
                value={skillForm}
                onChange={(nextValue) =>
                  setSkillForm((current) => ({
                    ...current,
                    ...nextValue,
                  }))
                }
                library={skillLibrary}
                disabled={!selectedJobId || skillSaving}
              />

              <div className="relative">
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="skill-search">
                  Search skills
                </label>
                <Search className="pointer-events-none absolute left-3 top-[2.6rem] h-4 w-4 text-slate-400" />
                <Input
                  id="skill-search"
                  className="pl-9"
                  value={skillQuery}
                  onChange={(event) => setSkillQuery(event.target.value)}
                  placeholder="Search by name or category"
                  disabled={!selectedJobId}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={skillForm.is_required ? 'primary' : 'secondary'}
                  onClick={() => setSkillForm((current) => ({ ...current, is_required: true }))}
                  disabled={!selectedJobId || skillSaving}
                >
                  Required
                </Button>
                <Button
                  type="button"
                  variant={!skillForm.is_required ? 'primary' : 'secondary'}
                  onClick={() => setSkillForm((current) => ({ ...current, is_required: false }))}
                  disabled={!selectedJobId || skillSaving}
                >
                  Optional
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={!selectedJobId || skillSaving}>
                  {skillSaving ? 'Saving...' : editingSkillId ? 'Update skill' : 'Add skill'}
                </Button>
                {editingSkillId ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetSkillForm}
                    disabled={skillSaving}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </div>

              {!selectedJobId ? (
                <p className="text-sm text-slate-500">Select a job to manage its skills.</p>
              ) : null}
              {skillMessage ? <p className="text-sm text-emerald-600">{skillMessage}</p> : null}
              {skillError ? <p className="text-sm text-rose-600">{skillError}</p> : null}
            </form>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                Required: {skillGroups.required_skills.length}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                Optional: {skillGroups.optional_skills.length}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                Total: {allSkills.length}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => refreshSkills().catch(() => null)}
                disabled={!selectedJobId}
              >
                Refresh skills
              </Button>
            </div>

            {filteredSkills.length ? (
              <div className="space-y-3">
                {filteredSkills.map((skill) => (
                  <div
                    key={`${skill.skill_id}-${skill.name}`}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-950">{skill.name}</h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            skill.is_required
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-sky-50 text-sky-700'
                          }`}
                        >
                          {skill.is_required ? 'Required' : 'Optional'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{skill.category || 'General'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditSkill(skill)}
                        disabled={!selectedJobId || skillSaving || skillDeletingId === skill.skill_id}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteSkill(skill)}
                        disabled={!selectedJobId || skillSaving || skillDeletingId === skill.skill_id}
                        loading={skillDeletingId === skill.skill_id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title={skillQuery.trim() ? 'No skills match your search' : 'No skills configured for this job'}
                description={
                  skillQuery.trim()
                    ? 'Try another skill name or category.'
                    : 'Add required and optional skills to power AI evaluation.'
                }
                icon={Plus}
              />
            )}
          </div>
        </div>
      </AdminCard>

      <Modal
        open={jobModalOpen}
        title={jobModalMode === 'edit' ? 'Edit job' : 'Create job'}
        className="w-[min(96vw,1400px)] max-w-none"
        bodyClassName="bg-slate-50/30"
        onClose={() => {
          if (savingJob) return;
          setJobModalOpen(false);
          setActiveJob(null);
          setJobError('');
        }}
      >
        <div className="space-y-5">
          <div className="rounded-[24px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <label className="block text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Company
            </label>
            <select
              className="mt-3 h-12 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 text-[15px] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)] outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
            >
              {companies.length ? (
                companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </option>
                ))
              ) : (
                <option value={selectedCompanyId}>{selectedCompanyName}</option>
              )}
            </select>
          </div>

          <JobForm
            key={jobFormVersion}
            initialValues={jobModalInitialValues}
            departments={availableDepartments}
            categories={categories}
            companyId={selectedCompanyId ? Number(selectedCompanyId) : undefined}
            onSubmit={handleJobSubmit}
            onCancel={() => {
              if (savingJob) return;
              setJobModalOpen(false);
              setActiveJob(null);
              setJobError('');
            }}
            submitting={savingJob}
          />

          {jobError ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {jobError}
            </div>
          ) : null}
        </div>
      </Modal>

      <DeleteModal
        open={jobDeleteOpen}
        job={activeJob}
        onClose={() => {
          if (deletingJob) return;
          setJobDeleteOpen(false);
          setActiveJob(null);
        }}
        onConfirm={handleJobDelete}
        submitting={deletingJob}
      />

      <Modal
        open={skillDeleteOpen}
        title="Delete skill"
        onClose={() => {
          if (skillDeletingId) return;
          setSkillDeleteOpen(false);
          setSkillPendingDelete(null);
        }}
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">
            <AlertTriangle className="mt-0.5 h-5 w-5" aria-hidden="true" />
            <p className="text-sm leading-6">
              This action permanently removes{' '}
              <span className="font-semibold">{skillPendingDelete?.name || 'this skill'}</span> from
              the selected job.
            </p>
          </div>

          <p className="text-sm leading-6 text-slate-600">
            Continue only if you are sure this skill should no longer be attached to the job.
          </p>

          {skillError ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {skillError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                if (skillDeletingId) return;
                setSkillDeleteOpen(false);
                setSkillPendingDelete(null);
              }}
              disabled={Boolean(skillDeletingId)}
            >
              Keep skill
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmDeleteSkill}
              disabled={Boolean(skillDeletingId)}
              className="bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-600"
            >
              {skillDeletingId ? 'Deleting...' : 'Delete skill'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
