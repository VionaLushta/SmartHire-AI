import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Suspense, lazy, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthInitializer from './AuthInitializer';
import ProtectedRoute from './ProtectedRoute';
import { logout } from '../redux/slices/authSlice';
import { ROUTES } from '../constants/routes';
import UnauthorizedPage from '../pages/errors/UnauthorizedPage';
import SessionExpiredPage from '../pages/errors/SessionExpiredPage';
import LoadingScreenPage from '../pages/errors/LoadingScreenPage';
import NotFoundPage from '../pages/errors/NotFoundPage';

const LandingPage = lazy(() => import('../pages/landing/LandingPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('../pages/auth/VerifyEmailPage'));
const EmailVerificationSuccessPage = lazy(() => import('../pages/auth/EmailVerificationSuccessPage'));
const JobsPage = lazy(() => import('../pages/jobs/JobsPage'));
const JobDetailsPage = lazy(() => import('../pages/jobs/JobDetailsPage'));
const CreateJobPage = lazy(() => import('../pages/jobs/CreateJobPage'));
const EditJobPage = lazy(() => import('../pages/jobs/EditJobPage'));
const SavedJobsPage = lazy(() => import('../pages/jobs/SavedJobsPage'));
const AppliedJobsPage = lazy(() => import('../pages/jobs/AppliedJobsPage'));
const CandidateDashboard = lazy(() => import('../pages/candidate/CandidateDashboard'));
const CompanyDashboard = lazy(() => import('../pages/company/CompanyDashboard'));
const ProfilePage = lazy(() => import('../pages/candidate/ProfilePage'));
const ResumePage = lazy(() => import('../pages/candidate/ResumePage'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminCandidatesPage = lazy(() => import('../pages/admin/AdminCandidatesPage'));
const AdminCompaniesPage = lazy(() => import('../pages/admin/AdminCompaniesPage'));
const AdminJobsPage = lazy(() => import('../pages/admin/AdminJobsPage'));
const AdminApplicationsPage = lazy(() => import('../pages/admin/AdminApplicationsPage'));
const AdminCatalogPage = lazy(() => import('../pages/admin/AdminCatalogPage'));
const AdminAnalyticsPage = lazy(() => import('../pages/admin/AdminAnalyticsPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'));
const AdminCandidateDetailPage = lazy(() => import('../pages/admin/AdminCandidateDetailPage'));
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'));

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
        <Suspense fallback={<LoadingScreenPage />}>
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
              <Route path={ROUTES.resetPassword.slice(1)} element={<ResetPasswordPage />} />
              <Route path={ROUTES.verifyEmail.slice(1)} element={<VerifyEmailPage />} />
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
                  <ProtectedRoute allowedRoles={['company', 'recruiter']}>
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
                path={ROUTES.adminCandidates.slice(1)}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminCandidatesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path={ROUTES.adminCandidateDetails.slice(1)}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminCandidateDetailPage />
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
                path={ROUTES.adminReports.slice(1)}
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminReportsPage />
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
        </Suspense>
      </AuthInitializer>
    </BrowserRouter>
  );
}
