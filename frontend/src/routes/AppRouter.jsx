import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthInitializer from './AuthInitializer';
import ProtectedRoute from './ProtectedRoute';
import { logout } from '../redux/slices/authSlice';
import { ROUTES } from '../constants/routes';
import LandingPage from '../pages/landing/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import EmailVerificationSuccessPage from '../pages/auth/EmailVerificationSuccessPage';
import JobsPage from '../pages/jobs/JobsPage';
import JobDetailsPage from '../pages/jobs/JobDetailsPage';
import CreateJobPage from '../pages/jobs/CreateJobPage';
import EditJobPage from '../pages/jobs/EditJobPage';
import SavedJobsPage from '../pages/jobs/SavedJobsPage';
import AppliedJobsPage from '../pages/jobs/AppliedJobsPage';
import CandidateDashboard from '../pages/candidate/CandidateDashboard';
import CompanyDashboard from '../pages/company/CompanyDashboard';
import ProfilePage from '../pages/candidate/ProfilePage';
import ResumePage from '../pages/candidate/ResumePage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminCompaniesPage from '../pages/admin/AdminCompaniesPage';
import AdminJobsPage from '../pages/admin/AdminJobsPage';
import AdminApplicationsPage from '../pages/admin/AdminApplicationsPage';
import AdminCatalogPage from '../pages/admin/AdminCatalogPage';
import AdminAnalyticsPage from '../pages/admin/AdminAnalyticsPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';
import UnauthorizedPage from '../pages/errors/UnauthorizedPage';
import SessionExpiredPage from '../pages/errors/SessionExpiredPage';
import LoadingScreenPage from '../pages/errors/LoadingScreenPage';
import NotFoundPage from '../pages/errors/NotFoundPage';

function SessionExpiryMonitor() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handleExpiredSession = () => {
      dispatch(logout());
      navigate('/session-expired', { replace: true });
    };

    window.addEventListener('auth:expired', handleExpiredSession);

    return () => {
      window.removeEventListener('auth:expired', handleExpiredSession);
    };
  }, [dispatch, navigate]);

  return null;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <SessionExpiryMonitor />
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<LandingPage />} />
            <Route path={ROUTES.jobs.slice(1)} element={<JobsPage />} />
            <Route path="jobs/new" element={<CreateJobPage />} />
            <Route path="saved-jobs" element={<SavedJobsPage />} />
            <Route path="applied-jobs" element={<AppliedJobsPage />} />
            <Route path={ROUTES.jobDetails.slice(1)} element={<JobDetailsPage />} />
            <Route path="jobs/:id/edit" element={<EditJobPage />} />
            <Route path={ROUTES.notFound} element={<NotFoundPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute publicOnly>
                <AuthLayout />
              </ProtectedRoute>
            }
          >
            <Route path={ROUTES.login.slice(1)} element={<LoginPage />} />
            <Route path={ROUTES.register.slice(1)} element={<RegisterPage />} />
            <Route path={ROUTES.forgotPassword.slice(1)} element={<ForgotPasswordPage />} />
          </Route>

          <Route element={<AuthLayout />}>
            <Route
              path={ROUTES.emailVerificationSuccess.slice(1)}
              element={<EmailVerificationSuccessPage />}
            />
            <Route path={ROUTES.loading.slice(1)} element={<LoadingScreenPage />} />
            <Route path={ROUTES.unauthorized.slice(1)} element={<UnauthorizedPage />} />
            <Route path={ROUTES.sessionExpired.slice(1)} element={<SessionExpiredPage />} />
          </Route>

          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path={ROUTES.candidateDashboard.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.companyDashboard.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['company']}>
                  <CompanyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminDashboard.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminUsers.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminCompanies.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCompaniesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminJobs.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminApplications.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminCatalog.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminCatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminAnalytics.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminAnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.adminSettings.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.profile.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path={ROUTES.resume.slice(1)}
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <ResumePage />
                </ProtectedRoute>
              }
            />
          </Route>

        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  );
}
