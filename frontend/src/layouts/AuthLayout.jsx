import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

export default function AuthLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { error } = useNotifications();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get('oauth_error');
    if (!oauthError) {
      return;
    }

    const provider = params.get('oauth_provider') || 'OAuth';
    const message =
      params.get('oauth_message') ||
      (oauthError === 'cancelled'
        ? `${provider} Sign-In was cancelled.`
        : oauthError === 'network'
          ? `Network issue while connecting to ${provider}. Please try again.`
          : `${provider} Sign-In could not be completed. Please try again.`);

    error('Sign-In unavailable', message, 4500);
    navigate(location.pathname, { replace: true });
  }, [error, location.pathname, location.search, navigate]);

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <Outlet />
    </main>
  );
}
