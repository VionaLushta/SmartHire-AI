import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { analyticsService } from '../../services/analyticsService';
import { applicationService } from '../../services/applicationService';
import { candidateService } from '../../services/candidateService';
import { companyService } from '../../services/companyService';
import { jobService } from '../../services/jobService';
import { resumeService } from '../../services/resumeService';
import { savedJobService } from '../../services/savedJobService';
import { notificationService } from '../../services/notificationService';
import { resumeAdvisorService } from '../../services/resumeAdvisorService';
import { unwrapItems, unwrapResponse, clampPercent } from '../../utils/dashboard';
import { PLATFORM_ORGANIZATION_NAME } from '../../constants/app';

const initialState = {
  dashboard: null,
  profile: null,
  analytics: null,
  recommendedJobs: [],
  savedJobs: [],
  applications: [],
  resume: null,
  resumeAnalysis: null,
  notifications: [],
  notificationReadIds: [],
  status: 'idle',
  error: null,
};

async function safeDetail(loader, id) {
  try {
    const response = await loader(id);
    return unwrapResponse(response);
  } catch {
    return null;
  }
}

async function enrichJobCard(baseJob) {
  const [jobDetail, companyDetail] = await Promise.all([
    baseJob.job_id ? safeDetail(jobService.detail, baseJob.job_id) : Promise.resolve(null),
    baseJob.company_id ? safeDetail(companyService.detail, baseJob.company_id) : Promise.resolve(null),
  ]);

  const source = jobDetail || {};
  const companyName =
    baseJob.company_name ||
    companyDetail?.name ||
    source.company_name ||
    source.company?.name ||
    PLATFORM_ORGANIZATION_NAME;

  return {
    ...baseJob,
    job_id: baseJob.job_id ?? source.job_id,
    title: baseJob.title ?? source.title ?? 'Role',
    company_id: baseJob.company_id ?? source.company_id ?? null,
    company_name: companyName,
    location: baseJob.location ?? source.location ?? 'Remote',
    remote_option: baseJob.remote_option ?? source.remote_option ?? false,
    salary_min: source.salary_min ?? baseJob.salary_min ?? null,
    salary_max: source.salary_max ?? baseJob.salary_max ?? null,
    deadline: baseJob.deadline ?? source.deadline ?? null,
    status: baseJob.status ?? source.status ?? null,
    department_name: baseJob.department_name ?? source.department?.name ?? null,
    required_skills: baseJob.required_skills ?? source.required_skills ?? [],
    optional_skills: baseJob.optional_skills ?? source.optional_skills ?? [],
    skills: baseJob.skills ?? source.skills ?? [],
    ai_score: baseJob.ai_score ?? source.ai_score ?? baseJob.match_score ?? null,
  };
}

async function enrichApplicationRow(application) {
  const jobDetail = application.job_id ? await safeDetail(jobService.detail, application.job_id) : null;
  const companyDetail =
    jobDetail?.company_id && !application.company_name
      ? await safeDetail(companyService.detail, jobDetail.company_id)
      : null;

  return {
    id: application.application_id ?? application.id ?? application.job_id,
    application_id: application.application_id ?? application.id ?? null,
    job_id: application.job_id ?? jobDetail?.job_id ?? null,
    company_name:
      application.company_name ||
      application.company?.name ||
      companyDetail?.name ||
      jobDetail?.company_name ||
      PLATFORM_ORGANIZATION_NAME,
    job_title: application.job_title ?? application.job?.title ?? jobDetail?.title ?? 'Applied role',
    status: application.status ?? 'submitted',
    applied_at: application.created_at ?? application.applied_at ?? application.submitted_at ?? null,
    ai_score:
      application.analysis?.overall_score ??
      application.overall_score ??
      application.ai_score ??
      jobDetail?.ai_score ??
      null,
    location: application.location ?? jobDetail?.location ?? null,
    jobHref: jobDetail?.job_id ? `/jobs/${jobDetail.job_id}` : '/jobs',
  };
}

function buildNotifications({
  dashboard,
  analytics,
  resume,
  applications,
  savedJobs,
  notificationItems = [],
}) {
  const items = notificationItems.map((item) => ({
    id: item.notification_id ?? item.id,
    notification_id: item.notification_id ?? item.id,
    title: item.title || item.subject || 'Account update',
    message: item.message || item.body || '',
    tone: item.type === 'rejected' ? 'danger' : item.type === 'accepted' ? 'success' : 'neutral',
    time: item.created_at || item.sent_at || 'Recently',
    read: Boolean(item.is_read ?? item.read),
  }));
  const profileCompletion = clampPercent(dashboard?.profile_completion_percent);

  items.push({
    id: 'profile-completion',
    title: 'Profile completion',
    message: `Your profile is ${profileCompletion}% complete.`,
    tone: profileCompletion >= 80 ? 'success' : 'warning',
    time: 'Today',
  });

  if (resume) {
    items.push({
      id: 'resume-upload',
      title: 'Resume ready',
      message: resume.created_at || resume.uploaded_at
        ? `Latest resume uploaded on ${new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }).format(new Date(resume.created_at ?? resume.uploaded_at))}.`
        : 'Latest resume uploaded recently.',
      tone: 'success',
      time: 'Today',
    });
  } else {
    items.push({
      id: 'resume-upload',
      title: 'Resume missing',
      message: 'Upload a resume to unlock better AI matching.',
      tone: 'warning',
      time: 'Today',
    });
  }

  if (applications.length > 0) {
    items.push({
      id: 'applications',
      title: 'Applications tracked',
      message: `${applications.length} applications are visible in your activity feed.`,
      tone: 'neutral',
      time: 'Today',
    });
    applications.slice(0, 4).forEach((application) => {
      const status = String(application.status || 'submitted').replace(/_/g, ' ');
      items.push({
        id: `application-${application.id}`,
        title: `${application.job_title} application updated`,
        message: `Current status: ${status}.`,
        tone: ['accepted', 'shortlisted', 'interviewed'].includes(String(application.status).toLowerCase()) ? 'success' : 'neutral',
        time: formatNotificationTime(application.applied_at),
      });
    });
  }

  if (dashboard?.interviews_count) {
    items.push({
      id: 'interviews',
      title: 'Interviews scheduled',
      message: `${dashboard.interviews_count} interview${dashboard.interviews_count === 1 ? '' : 's'} on your pipeline.`,
      tone: 'success',
      time: 'Today',
    });
  }

  if (savedJobs.length > 0) {
    items.push({
      id: 'saved-jobs',
      title: 'Saved jobs',
      message: `${savedJobs.length} saved opportunities are ready for review.`,
      tone: 'neutral',
      time: 'Today',
    });
  }

  const insight = analytics?.insights?.[0];
  if (insight) {
    items.push({
      id: 'insight',
      title: 'AI insight',
      message: insight,
      tone: 'neutral',
      time: 'Today',
    });
  }

  return items.slice(0, 6);
}

function formatNotificationTime(value) {
  if (!value) return 'Recently';
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return 'Recently';
  }
}

export const loadCandidateDashboard = createAsyncThunk(
  'candidate/loadDashboard',
  async ({ candidateId }, { rejectWithValue }) => {
    try {
      const [
        dashboardResult,
        profileResult,
        analyticsResult,
        savedJobsResult,
        resumesResult,
        applicationsResult,
        notificationsResult,
        resumeAnalysisResult,
      ] = await Promise.allSettled([
        candidateService.dashboard(),
        candidateService.profile(),
        analyticsService.candidate(candidateId),
        savedJobService.list(),
        resumeService.list(),
        applicationService.list(),
        notificationService.list(),
        resumeAdvisorService.report(),
      ]);

      const dashboard = unwrapResponse(
        dashboardResult.status === 'fulfilled' ? dashboardResult.value : null,
      );
      const profile = unwrapResponse(
        profileResult.status === 'fulfilled' ? profileResult.value : null,
      );
      const analytics = unwrapResponse(
        analyticsResult.status === 'fulfilled' ? analyticsResult.value : null,
      );
      const savedJobItems = unwrapItems(
        savedJobsResult.status === 'fulfilled' ? savedJobsResult.value : null,
      );
      const resumeItems = unwrapItems(
        resumesResult.status === 'fulfilled' ? resumesResult.value : null,
      );
      const applicationItems = unwrapItems(
        applicationsResult.status === 'fulfilled' ? applicationsResult.value : null,
      );
      const notificationItems = unwrapItems(
        notificationsResult.status === 'fulfilled' ? notificationsResult.value : null,
      );
      const resumeAnalysis = unwrapResponse(
        resumeAnalysisResult.status === 'fulfilled' ? resumeAnalysisResult.value : null,
      );

      const [recommendedJobs, savedJobs, applications] = await Promise.all([
        Promise.all((dashboard?.recommended_jobs ?? []).map((job) => enrichJobCard(job))),
        Promise.all(savedJobItems.map((item) => enrichJobCard(item))),
        Promise.all(applicationItems.map((item) => enrichApplicationRow(item))),
      ]);

      const resume = dashboard?.uploaded_resume ?? resumeItems[0] ?? null;
      const notifications = buildNotifications({
        dashboard,
        profile,
        analytics,
        resume,
        resumeAnalysis,
        applications,
        savedJobs,
        notificationItems,
      });

      return {
        dashboard,
        profile: profile || dashboard || null,
        analytics,
        recommendedJobs,
        savedJobs,
        applications,
        resume,
        notifications,
        notificationReadIds: notifications.filter((item) => item.read).map((item) => item.id),
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load the candidate dashboard.',
      );
    }
  },
);

export const updateCandidateProfile = createAsyncThunk(
  'candidate/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await candidateService.update(payload);
      return unwrapResponse(response);
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to update the profile.',
      );
    }
  },
);

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    markNotificationRead(state, action) {
      const id = action.payload;
      if (!state.notificationReadIds.includes(id)) {
        state.notificationReadIds.push(id);
      }
    },
    markAllNotificationsRead(state) {
      state.notificationReadIds = state.notifications.map((item) => item.id);
    },
    resetCandidateDashboard(state) {
      state.dashboard = null;
      state.profile = null;
      state.analytics = null;
      state.recommendedJobs = [];
      state.savedJobs = [];
      state.applications = [];
      state.resume = null;
      state.resumeAnalysis = null;
      state.notifications = [];
      state.notificationReadIds = [];
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCandidateDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCandidateDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.dashboard = action.payload.dashboard;
        state.profile = action.payload.profile;
        state.analytics = action.payload.analytics;
        state.recommendedJobs = action.payload.recommendedJobs;
        state.savedJobs = action.payload.savedJobs;
        state.applications = action.payload.applications;
        state.resume = action.payload.resume;
        state.resumeAnalysis = action.payload.resumeAnalysis;
        state.notifications = action.payload.notifications;
        state.notificationReadIds = action.payload.notificationReadIds || [];
        state.error = null;
      })
      .addCase(loadCandidateDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Unable to load dashboard.';
      })
      .addCase(updateCandidateProfile.pending, (state) => {
        state.status = 'saving';
        state.error = null;
      })
      .addCase(updateCandidateProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload || state.profile;
        state.error = null;
      })
      .addCase(updateCandidateProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Unable to update the profile.';
      });
  },
});

export const {
  markNotificationRead,
  markAllNotificationsRead,
  resetCandidateDashboard,
} = candidateSlice.actions;

export default candidateSlice.reducer;
