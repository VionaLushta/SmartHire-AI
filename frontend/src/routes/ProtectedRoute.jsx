import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreenPage from '../pages/errors/LoadingScreenPage';
import { getDashboardPathForRole, getSafeInternalPath } from '../utils/auth';

export default function ProtectedRoute({
  children,
  allowedRoles = null,
  publicOnly = false,
}) {
  const location = useLocation();
  const { user, token, bootstrapped, status } = useSelector((state) => state.auth);
  const authenticated = Boolean(token || user);

  if (!bootstrapped || status === 'loading') {
    return <LoadingScreenPage />;
  }

  if (publicOnly) {
    if (authenticated) {
      const roleName = String(user?.role_name || user?.role || '').toLowerCase();
      const isAdminLogin = location.pathname.startsWith('/admin/login');
      const isCandidateAuth = location.pathname.startsWith('/candidate/');
      const shouldRedirect = (isAdminLogin && roleName === 'admin') || (isCandidateAuth && roleName === 'candidate');
      if (!shouldRedirect) {
        return children || <Outlet />;
      }
      const search = location.search ? new URLSearchParams(location.search) : null;
      const returnTo = getSafeInternalPath(search?.get('returnTo') || location.state?.returnTo, '');
      return (
        <Navigate
          to={returnTo || getDashboardPathForRole(user?.role_name || user?.role)}
          replace
        />
      );
    }

    return children || <Outlet />;
  }

  if (!authenticated) {
    return <Navigate to={location.pathname.startsWith('/admin') ? '/admin/login' : '/candidate/login'} replace state={{ from: location }} />;
  }

  const roleName = String(user?.role_name || user?.role || '').toLowerCase();
  if (allowedRoles?.length) {
    const normalizedRoles = allowedRoles.map((role) => String(role).toLowerCase());
    if (!normalizedRoles.includes(roleName)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children || <Outlet />;
}
