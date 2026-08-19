import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import JobForm from '../../components/jobs/JobForm';
import { createJob } from '../../redux/slices/jobSlice';
import { departmentService } from '../../services/departmentService';
import { jobCategoryService } from '../../services/jobCategoryService';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';

export default function CreateJobPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [departmentResponse, categoryResponse] = await Promise.all([
          departmentService.list(),
          jobCategoryService.list(),
        ]);

        setDepartments(unwrapItems(departmentResponse));
        setCategories(unwrapItems(categoryResponse));
      } catch {
        setDepartments([]);
        setCategories([]);
      }
    }

    loadMetadata();
  }, []);

  async function handleSubmit(payload) {
    setSubmitting(true);
    const resultAction = await dispatch(createJob(payload));
    setSubmitting(false);

    if (createJob.fulfilled.match(resultAction)) {
      navigate('/jobs');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Company roles</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create a new role</h1>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <JobForm
          initialValues={null}
          departments={departments}
          categories={categories}
          companyId={1}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/jobs')}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
