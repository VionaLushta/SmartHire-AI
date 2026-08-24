import { useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';
import { dashboardPageMeta } from '../constants/navigation';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);

  const currentMeta = useMemo(() => {
    if (dashboardPageMeta[location.pathname]) {
      return dashboardPageMeta[location.pathname];
    }

    if (location.pathname.startsWith('/admin/candidates/')) {
      return {
        title: 'Candidate Detail',
        breadcrumbs: ['Dashboard', 'Admin', 'Candidates', 'Candidate Detail'],
      };
    }

    if (location.pathname.startsWith('/jobs/')) {
      return {
        title: 'Job Details',
        breadcrumbs: ['Dashboard', 'Jobs', 'Job Details'],
      };
    }

    if (location.pathname === '/jobs') {
      return {
        title: 'Jobs',
        breadcrumbs: ['Dashboard', 'Jobs'],
      };
    }

    return {
      title: 'Dashboard',
      breadcrumbs: ['Dashboard'],
    };
  }, [location.pathname]);

  const actionConfig = useMemo(() => {
    const roleName = String(user?.role_name || user?.role || '').toLowerCase();
    if (location.pathname.startsWith('/admin/candidates/')) {
      return { actionLabel: 'Back to candidates', actionTo: '/admin/candidates' };
    }
    if (location.pathname.startsWith('/admin')) {
      return { actionLabel: 'Open analytics', actionTo: '/admin/analytics' };
    }
    if (location.pathname.startsWith('/candidate')) {
      return { actionLabel: 'Browse jobs', actionTo: '/jobs' };
    }
    if (location.pathname.startsWith('/company')) {
      return { actionLabel: 'Create job', actionTo: '/jobs' };
    }
    if (roleName === 'candidate') {
      return { actionLabel: 'Browse jobs', actionTo: '/jobs' };
    }
    return { actionLabel: 'Action placeholder', actionTo: undefined };
  }, [location.pathname, user?.role, user?.role_name]);

  return (
    <div className="flex min-h-screen text-slate-900">
      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          title={currentMeta.title}
          breadcrumbs={currentMeta.breadcrumbs.map((label, index) => ({
            label,
            to:
              index === 0
                ? location.pathname.startsWith('/company')
                  ? '/company/dashboard'
                  : '/candidate/dashboard'
                : undefined,
          }))}
          actionLabel={actionConfig.actionLabel}
          actionTo={actionConfig.actionTo}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <PageContainer className="flex-1">
          <Outlet />
        </PageContainer>

        <Footer />
      </div>
    </div>
  );
}
