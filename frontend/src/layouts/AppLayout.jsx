import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PageContainer from '../components/layout/PageContainer';

export default function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-shell flex min-h-screen flex-col text-slate-900">
      <Navbar />
      {isHome ? (
        <main className="flex-1">
          <Outlet />
        </main>
      ) : (
        <PageContainer className="flex-1 pb-12 pt-7">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </PageContainer>
      )}
      <Footer />
    </div>
  );
}
