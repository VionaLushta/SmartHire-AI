import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function CandidateApplyAuthPage() {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('returnTo') || '/jobs';
  const encodedReturn = encodeURIComponent(returnTo);
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl items-center px-4 py-10">
      <section className="w-full rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">Continue your application</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Create or sign in to your candidate account</h1>
        <p className="mt-3 text-slate-600">Your selected job will be kept while you register or sign in.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button as={Link} to={`/candidate/register?returnTo=${encodedReturn}`} variant="primary">Create Candidate Account</Button>
          <Button as={Link} to={`/candidate/login?returnTo=${encodedReturn}`} variant="secondary">Sign In</Button>
        </div>
      </section>
    </div>
  );
}
