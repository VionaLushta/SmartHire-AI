import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationContext';
import JobForm from '../../components/jobs/JobForm';
import { fetchJobById, updateJob } from '../../redux/slices/jobSlice';
import { departmentService } from '../../services/departmentService';
import { jobCategoryService } from '../../services/jobCategoryService';
import { unwrapItems } from '../../utils/dashboard';

export default function EditJobPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { success } = useNotifications();
  const { selectedJob } = useSelector((state) => state.jobs);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchJobById(id));
    }

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
  }, [dispatch, id]);

  async function handleSubmit(payload) {
    setSubmitting(true);
    const resultAction = await dispatch(updateJob({ jobId: id, payload }));
    setSubmitting(false);

    if (updateJob.fulfilled.match(resultAction)) {
      success('Job updated', 'The role was saved successfully.');
      navigate(`/jobs/${id}`);
    }
  }

  const initialValues = selectedJob
    ? {
        ...selectedJob,
        department_id: selectedJob.department_id ?? '',
        category_ids: Array.isArray(selectedJob.category_ids) ? selectedJob.category_ids.join(', ') : '',
        salary_min: selectedJob.salary_min ?? '',
        salary_max: selectedJob.salary_max ?? '',
        deadline: selectedJob.deadline ? selectedJob.deadline.split('T')[0] : '',
        description: selectedJob.description || '',
        requirements: selectedJob.requirements || '',
        responsibilities: selectedJob.responsibilities || '',
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Role management</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Edit role</h1>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        {selectedJob ? (
          <JobForm
            initialValues={initialValues}
            departments={departments}
            categories={categories}
            companyId={selectedJob.company_id ?? 1}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/jobs/${id}`)}
            submitting={submitting}
          />
        ) : (
          <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Loading job details...</div>
        )}
      </div>
    </div>
  );
}
