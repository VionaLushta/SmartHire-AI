import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.06),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-4 py-6 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.32),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:text-slate-50 sm:px-6 lg:px-8 lg:py-8">
      <Outlet />
    </main>
  );
}
