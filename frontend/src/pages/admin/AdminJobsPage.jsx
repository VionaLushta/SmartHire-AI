import { useEffect, useMemo, useState } from 'react';
import { Archive, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchJobs } from '../../redux/slices/jobSlice';
import { jobSkillService } from '../../services/jobSkillService';
import AdminCard from '../../components/admin/AdminCard';
import StatusBadge from '../../components/admin/StatusBadge';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function AdminJobsPage() {
  const dispatch = useDispatch();
  const { items: jobs, status } = useSelector((state) => state.jobs);
  const [query, setQuery] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [skillGroups, setSkillGroups] = useState({ required_skills: [], optional_skills: [] });
  const [skillForm, setSkillForm] = useState({
    name: '',
    category: '',
    is_required: true,
  });
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!jobs.length && status !== 'loading') {
      dispatch(fetchJobs());
    }
  }, [dispatch, jobs.length, status]);

  useEffect(() => {
    if (!selectedJobId && jobs.length) {
      setSelectedJobId(String(jobs[0].job_id));
    }
  }, [jobs, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId) return;
    jobSkillService
      .list(selectedJobId)
      .then((response) => {
        const payload = response.data || {};
        setSkillGroups({
          required_skills: payload.required_skills || [],
          optional_skills: payload.optional_skills || [],
        });
      })
      .catch(() => {
        setSkillGroups({ required_skills: [], optional_skills: [] });
      });
  }, [selectedJobId]);

  const filteredJobs = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((job) => `${job.title} ${job.company_name} ${job.location}`.toLowerCase().includes(term));
  }, [jobs, query]);

  const selectedJob = useMemo(
    () => jobs.find((job) => String(job.job_id) === String(selectedJobId)) || null,
    [jobs, selectedJobId],
  );

  const allSkills = useMemo(
    () => [...skillGroups.required_skills, ...skillGroups.optional_skills],
    [skillGroups],
  );

  function resetForm() {
    setSkillForm({
      name: '',
      category: '',
      is_required: true,
    });
    setEditingSkillId(null);
  }

  async function refreshSkills() {
    if (!selectedJobId) return;
    const response = await jobSkillService.list(selectedJobId);
    const payload = response.data || {};
    setSkillGroups({
      required_skills: payload.required_skills || [],
      optional_skills: payload.optional_skills || [],
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedJobId || !skillForm.name.trim()) return;
    setMessage('');
    try {
      if (editingSkillId) {
        await jobSkillService.update(selectedJobId, editingSkillId, {
          name: skillForm.name.trim(),
          category: skillForm.category.trim() || null,
          is_required: skillForm.is_required,
        });
        setMessage('Skill updated successfully.');
      } else {
        await jobSkillService.create(selectedJobId, {
          name: skillForm.name.trim(),
          category: skillForm.category.trim() || null,
          is_required: skillForm.is_required,
        });
        setMessage('Skill added successfully.');
      }
      await refreshSkills();
      resetForm();
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Unable to save skill.');
    }
  }

  async function handleDelete(skill) {
    if (!selectedJobId) return;
    try {
      await jobSkillService.remove(selectedJobId, skill.skill_id);
      await refreshSkills();
      setMessage(`${skill.name} removed.`);
    } catch (error) {
      setMessage(error?.response?.data?.detail || 'Unable to remove skill.');
    }
  }

  function handleEdit(skill) {
    setEditingSkillId(skill.skill_id);
    setSkillForm({
      name: skill.name || '',
      category: skill.category || '',
      is_required: Boolean(skill.is_required),
    });
  }

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
          <Button variant="primary" type="button">
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
                {filteredJobs.map((job) => (
                  <tr
                    key={job.job_id}
                    className={`cursor-pointer hover:bg-slate-50 ${String(job.job_id) === String(selectedJobId) ? 'bg-slate-50' : ''}`}
                    onClick={() => setSelectedJobId(String(job.job_id))}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{job.title}</p>
                        <p className="text-sm text-slate-500">{job.location}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{job.company_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status || 'active'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" type="button">
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" type="button">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" type="button">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            <label className="block text-sm font-medium text-slate-700" htmlFor="job-skill-job">
              Active job
            </label>
            <select
              id="job-skill-job"
              className="h-11 w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-3 text-[15px] text-slate-700 outline-none transition duration-150 ease-out hover:border-[rgba(15,23,42,0.12)] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              <option value="">Select a job</option>
              {jobs.map((job) => (
                <option key={job.job_id} value={job.job_id}>
                  {job.title} - {job.company_name}
                </option>
              ))}
            </select>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="skill-name">
                  Skill name
                </label>
                <Input
                  id="skill-name"
                  value={skillForm.name}
                  onChange={(event) => setSkillForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Python"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="skill-category">
                  Category
                </label>
                <Input
                  id="skill-category"
                  value={skillForm.category}
                  onChange={(event) => setSkillForm((current) => ({ ...current, category: event.target.value }))}
                  placeholder="Backend"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={skillForm.is_required ? 'primary' : 'secondary'}
                  onClick={() => setSkillForm((current) => ({ ...current, is_required: true }))}
                >
                  Required
                </Button>
                <Button
                  type="button"
                  variant={!skillForm.is_required ? 'primary' : 'secondary'}
                  onClick={() => setSkillForm((current) => ({ ...current, is_required: false }))}
                >
                  Optional
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary">
                  {editingSkillId ? 'Update skill' : 'Add skill'}
                </Button>
                {editingSkillId ? (
                  <Button type="button" variant="secondary" onClick={resetForm}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>

              {message ? <p className="text-sm text-slate-600">{message}</p> : null}
            </form>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                Required: {skillGroups.required_skills.length}
              </span>
              <span className="rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                Optional: {skillGroups.optional_skills.length}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                Total: {allSkills.length}
              </span>
            </div>

            {allSkills.length ? (
              <div className="space-y-3">
                {allSkills.map((skill) => (
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
                      <Button type="button" variant="secondary" size="sm" onClick={() => handleEdit(skill)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(skill)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No skills configured for this job"
                description="Add required and optional skills to power AI evaluation."
                icon={Plus}
              />
            )}
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
