import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import JobForm from '../../components/jobs/JobForm';
import { createJob } from '../../redux/slices/jobSlice';
import { departmentService } from '../../services/departmentService';
import { jobCategoryService } from '../../services/jobCategoryService';
import { unwrapItems } from '../../utils/dashboard';

export default function CreateJobPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { success } = useNotifications();
  const { user } = useSelector((state) => state.auth);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const companyId =
    user?.company_id ??
    user?.companyId ??
    user?.company?.company_id ??
    user?.company?.id ??
    1;

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [departmentResponse, categoryResponse] = await Promise.all([
          departmentService.list({ page_size: 100 }),
          jobCategoryService.list({ page_size: 100 }),
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
      success('Job created', 'The new role was saved successfully.');
      navigate('/jobs');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Open positions</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create a new role</h1>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <JobForm
          initialValues={null}
          departments={departments}
          categories={categories}
          companyId={companyId}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/jobs')}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
