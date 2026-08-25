import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingScreenPage from '../pages/errors/LoadingScreenPage';
import { getDashboardPathForRole } from '../utils/auth';

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
      return <Navigate to={getDashboardPathForRole(user?.role_name || user?.role)} replace />;
    }

    return children || <Outlet />;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
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
