import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { applicationService } from '../../services/applicationService';
import { companyService } from '../../services/companyService';
import { departmentService } from '../../services/departmentService';
import { jobCategoryService } from '../../services/jobCategoryService';
import { jobService } from '../../services/jobService';
import { savedJobService } from '../../services/savedJobService';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';

const initialState = {
  items: [],
  selectedJob: null,
  savedJobs: [],
  totalItems: 0,
  totalPages: 0,
  page: 1,
  pageSize: 10,
  categories: [],
  departments: [],
  status: 'idle',
  error: null,
};

function normalizeJob(job = {}) {
  return {
    ...job,
    job_id: job.job_id ?? job.id ?? null,
    title: job.title ?? 'Position',
    company_name: job.company_name ?? job.company?.name ?? 'Company',
    department_name: job.department_name ?? job.department?.name ?? 'General',
    location: job.location ?? 'Remote',
    employment_type: job.employment_type ?? 'Full-time',
    experience_level: job.experience_level ?? 'Mid',
    salary_min: job.salary_min ?? null,
    salary_max: job.salary_max ?? null,
    category_ids: Array.isArray(job.category_ids) ? job.category_ids : [],
    required_skills: Array.isArray(job.required_skills) ? job.required_skills : [],
  };
}

async function enrichJob(job) {
  const [companyResult, departmentResult, categoryResults] = await Promise.allSettled([
    job.company_id ? companyService.detail(job.company_id) : Promise.resolve(null),
    job.department_id ? departmentService.detail(job.department_id) : Promise.resolve(null),
    job.category_ids?.length
      ? Promise.all(job.category_ids.map((id) => jobCategoryService.detail(id)))
      : Promise.resolve([]),
  ]);

  const company = unwrapResponse(companyResult.status === 'fulfilled' ? companyResult.value : null);
  const department = unwrapResponse(departmentResult.status === 'fulfilled' ? departmentResult.value : null);
  const categories = (categoryResults || []).map((item) => unwrapResponse(item.status === 'fulfilled' ? item.value : null)).filter(Boolean);

  return normalizeJob({
    ...job,
    company_name: job.company_name || company?.name || 'Company',
    department_name: job.department_name || department?.name || 'General',
    skill_names: categories.map((category) => category.name),
    required_skills: categories.length
      ? categories.map((category) => category.name)
      : job.required_skills || [],
  });
}

export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await jobService.list();
      const payload = unwrapResponse(response) || {};
      const items = unwrapItems(response);
      const enriched = await Promise.all(items.map((job) => enrichJob(job)));
      return {
        items: enriched,
        totalItems: payload.total_items ?? enriched.length,
        totalPages: payload.total_pages ?? 1,
        page: payload.page ?? 1,
        pageSize: payload.page_size ?? enriched.length,
      };
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to load jobs.');
    }
  },
);

export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await jobService.detail(jobId);
      const job = unwrapResponse(response);
      return normalizeJob(await enrichJob(job));
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to load job details.');
    }
  },
);

export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await jobService.create(payload);
      return normalizeJob(await enrichJob(unwrapResponse(response)));
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to create the job.');
    }
  },
);

export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ jobId, payload }, { rejectWithValue }) => {
    try {
      const response = await jobService.update(jobId, payload);
      return normalizeJob(await enrichJob(unwrapResponse(response)));
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to update the job.');
    }
  },
);

export const deleteJob = createAsyncThunk(
  'jobs/deleteJob',
  async (jobId, { rejectWithValue }) => {
    try {
      await jobService.remove(jobId);
      return jobId;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to delete the job.');
    }
  },
);

export const fetchSavedJobs = createAsyncThunk(
  'jobs/fetchSavedJobs',
  async (_, { rejectWithValue }) => {
    try {
      const response = await savedJobService.list();
      const items = unwrapItems(response);
      const enriched = await Promise.all(
        items.map(async (savedJob) => {
          if (!savedJob.job_id) return savedJob;
          const job = await jobService.detail(savedJob.job_id).catch(() => null);
          const detail = unwrapResponse(job);
          return {
            ...savedJob,
            job: detail ? await enrichJob(detail) : null,
          };
        }),
      );
      return enriched;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to load saved jobs.');
    }
  },
);

export const saveJob = createAsyncThunk(
  'jobs/saveJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await savedJobService.create({ job_id: Number(jobId) });
      return unwrapResponse(response);
    } catch (error) {
      if (error?.response?.status === 409) {
        return null;
      }
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to save the job.');
    }
  },
);

export const removeSavedJob = createAsyncThunk(
  'jobs/removeSavedJob',
  async (jobId, { rejectWithValue }) => {
    try {
      await savedJobService.remove(jobId);
      return jobId;
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to remove the saved job.');
    }
  },
);

export const applyToJob = createAsyncThunk(
  'jobs/applyToJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await applicationService.create({ job_id: Number(jobId) });
      return unwrapResponse(response);
    } catch (error) {
      return rejectWithValue(error?.response?.data?.detail || error?.message || 'Unable to submit the application.');
    }
  },
);

const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearJobError(state) {
      state.error = null;
    },
    setJobPage(state, action) {
      state.page = action.payload;
    },
    clearSelectedJob(state) {
      state.selectedJob = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items;
        state.totalItems = action.payload.totalItems;
        state.totalPages = action.payload.totalPages;
        state.page = action.payload.page;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Unable to load jobs.';
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.selectedJob = action.payload;
      })
      .addCase(fetchSavedJobs.fulfilled, (state, action) => {
        state.savedJobs = action.payload;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items];
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.items = state.items.map((job) =>
          String(job.job_id) === String(action.payload.job_id) ? action.payload : job,
        );
        if (state.selectedJob && String(state.selectedJob.job_id) === String(action.payload.job_id)) {
          state.selectedJob = action.payload;
        }
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        state.items = state.items.filter((job) => String(job.job_id) !== String(action.payload));
        if (state.selectedJob && String(state.selectedJob.job_id) === String(action.payload)) {
          state.selectedJob = null;
        }
      })
      .addCase(saveJob.fulfilled, (state, action) => {
        if (action.payload) {
          state.savedJobs = [action.payload, ...state.savedJobs];
        }
      })
      .addCase(removeSavedJob.fulfilled, (state, action) => {
        state.savedJobs = state.savedJobs.filter(
          (savedJob) => String(savedJob.job_id) !== String(action.payload),
        );
      });
  },
});

export const { clearJobError, setJobPage, clearSelectedJob } = jobSlice.actions;

export default jobSlice.reducer;
