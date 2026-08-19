import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { analyticsService } from '../../services/analyticsService';
import { companyDashboardService } from '../../services/companyDashboardService';
import { jobDashboardService } from '../../services/jobDashboardService';
import { unwrapResponse, clampPercent } from '../../utils/dashboard';

const initialState = {
  dashboard: null,
  analytics: null,
  activeJobs: [],
  recentApplications: [],
  topCandidates: [],
  notifications: [],
  notificationReadIds: [],
  companyId: null,
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

function buildJobSnapshot(jobDashboard) {
  const job = jobDashboard?.job || {};
  const department = jobDashboard?.department || {};
  return {
    job_id: job.job_id ?? null,
    title: job.title ?? 'Role',
    department_name: department.name ?? 'Department',
    applicants_count: jobDashboard?.applicants_count ?? 0,
    ai_average_score: clampPercent(jobDashboard?.ai_average_score),
    hiring_status: jobDashboard?.hiring_status ?? job.status ?? 'open',
    interview_count: jobDashboard?.interview_count ?? 0,
    detailsHref: job.job_id ? `/jobs/${job.job_id}` : '/jobs',
    company_id: job.company_id ?? null,
  };
}

function buildApplicationRows(jobDashboard) {
  const job = jobDashboard?.job || {};
  const department = jobDashboard?.department || {};
  const scoreByApplicationId = new Map(
    (jobDashboard?.top_candidates || []).map((item) => [
      String(item.application_id),
      clampPercent(item.overall_score),
    ]),
  );

  return (jobDashboard?.recent_applications || []).map((item) => ({
    id: item.application_id,
    application_id: item.application_id,
    candidate_name: item.user_name || 'Candidate',
    job_id: job.job_id ?? null,
    job_title: job.title ?? 'Job',
    department_name: department.name ?? 'Department',
    applied_at: item.created_at ?? null,
    status: item.status ?? 'submitted',
    ai_score: scoreByApplicationId.get(String(item.application_id)) ?? null,
    jobHref: job.job_id ? `/jobs/${job.job_id}` : '/jobs',
  }));
}

function buildNotifications({ dashboard, analytics, activeJobs, recentApplications }) {
  const items = [];

  items.push({
    id: 'company-summary',
    title: 'Company dashboard loaded',
    message: `${dashboard?.total_jobs ?? 0} jobs, ${dashboard?.applications_count ?? 0} applications, and ${dashboard?.pending_applications ?? 0} pending items are ready for review.`,
    tone: 'neutral',
    time: 'Today',
  });

  if (dashboard?.pending_applications) {
    items.push({
      id: 'pending-applications',
      title: 'Pending applications',
      message: `${dashboard.pending_applications} application${dashboard.pending_applications === 1 ? '' : 's'} still need attention.`,
      tone: 'warning',
      time: 'Today',
    });
  }

  if (dashboard?.ai_average_score != null) {
    items.push({
      id: 'ai-average',
      title: 'AI match average',
      message: `The current company average is ${clampPercent(dashboard.ai_average_score)}%.`,
      tone: 'success',
      time: 'Today',
    });
  }

  if (activeJobs.length > 0) {
    items.push({
      id: 'active-jobs',
      title: 'Active jobs in view',
      message: `${activeJobs.length} live job card${activeJobs.length === 1 ? '' : 's'} are surfaced from the dashboard data.`,
      tone: 'neutral',
      time: 'Today',
    });
  }

  if (recentApplications.length > 0) {
    items.push({
      id: 'recent-applications',
      title: 'Recent applications',
      message: `${recentApplications.length} recent applications are displayed across the live job snapshots.`,
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
      tone: 'success',
      time: 'Today',
    });
  }

  return items.slice(0, 6);
}

function dedupeApplications(applications) {
  const seen = new Set();
  return applications.filter((item) => {
    const key = String(item.application_id ?? item.id ?? `${item.candidate_name}-${item.job_id}`);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export const loadCompanyDashboard = createAsyncThunk(
  'company/loadDashboard',
  async ({ companyId }, { rejectWithValue }) => {
    if (!companyId) {
      return rejectWithValue('A company context is required to load the dashboard.');
    }

    try {
      const [dashboardResult, analyticsResult] = await Promise.allSettled([
        companyDashboardService.dashboard(companyId),
        analyticsService.company(companyId),
      ]);

      const dashboard = unwrapResponse(
        dashboardResult.status === 'fulfilled' ? dashboardResult.value : null,
      );
      const analytics = unwrapResponse(
        analyticsResult.status === 'fulfilled' ? analyticsResult.value : null,
      );

      const recentJobIds = Array.from(
        new Set((dashboard?.recent_applications || []).map((item) => item.job_id)),
      ).slice(0, 4);

      const jobSnapshots = await Promise.all(
        recentJobIds.map(async (jobId) => safeDetail(jobDashboardService.dashboard, jobId)),
      );

      const activeJobs = jobSnapshots.filter(Boolean).map(buildJobSnapshot);
      const recentApplications = dedupeApplications(
        jobSnapshots.flatMap((snapshot) => buildApplicationRows(snapshot)),
      );
      const analyticsTopCandidates = analytics?.top_candidates || [];
      const jobTopCandidates = jobSnapshots.flatMap((snapshot) =>
        (snapshot?.top_candidates || []).map((item) => ({
          candidate_id: String(item.user_id || item.candidate_id || item.application_id),
          candidate_name: item.user_name || item.candidate_name || 'Candidate',
          ai_score: clampPercent(item.overall_score ?? item.ai_score),
          skill_match: clampPercent(item.skill_match),
          experience_match: clampPercent(item.experience_match),
        })),
      );
      const topCandidates = analyticsTopCandidates.length ? analyticsTopCandidates : jobTopCandidates;

      const notifications = buildNotifications({
        dashboard,
        analytics,
        activeJobs,
        recentApplications,
      });

      return {
        companyId,
        dashboard,
        analytics,
        activeJobs,
        recentApplications,
        topCandidates,
        notifications,
      };
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load the company dashboard.',
      );
    }
  },
);

const companySlice = createSlice({
  name: 'companies',
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
    resetCompanyDashboard(state) {
      state.dashboard = null;
      state.analytics = null;
      state.activeJobs = [];
      state.recentApplications = [];
      state.topCandidates = [];
      state.notifications = [];
      state.notificationReadIds = [];
      state.companyId = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCompanyDashboard.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loadCompanyDashboard.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.companyId = action.payload.companyId;
        state.dashboard = action.payload.dashboard;
        state.analytics = action.payload.analytics;
        state.activeJobs = action.payload.activeJobs;
        state.recentApplications = action.payload.recentApplications;
        state.topCandidates = action.payload.topCandidates;
        state.notifications = action.payload.notifications;
        state.error = null;
      })
      .addCase(loadCompanyDashboard.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error.message || 'Unable to load dashboard.';
      });
  },
});

export const {
  markNotificationRead,
  markAllNotificationsRead,
  resetCompanyDashboard,
} = companySlice.actions;

export default companySlice.reducer;
