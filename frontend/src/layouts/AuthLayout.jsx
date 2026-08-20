import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <Outlet />
    </main>
  );
}
