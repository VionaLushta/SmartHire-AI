import { useEffect } from 'react';
import { CalendarDays, Github, Globe, Linkedin, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/ui/Button';
import LoadingState from '../../components/jobs/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { loadCandidateDashboard } from '../../redux/slices/candidateSlice';

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-medium text-slate-950">{value || 'Not added yet'}</p>
    </div>
  );
}

function ExternalLink({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </div>
      {value ? (
        <a href={value} target="_blank" rel="noreferrer" className="mt-2 block truncate text-sm font-medium text-blue-700 hover:underline">
          {value}
        </a>
      ) : <p className="mt-2 text-sm font-medium text-slate-400">Not added yet</p>}
    </div>
  );
}

export default function CandidateDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { profile, status, error } = useSelector((state) => state.candidate);
  const candidate = profile || user || {};
  const candidateId = user?.user_id || user?.id;

  useEffect(() => {
    if (candidateId && status === 'idle') dispatch(loadCandidateDashboard({ candidateId }));
  }, [candidateId, dispatch, status]);

  const profileFields = [
    candidate.first_name,
    candidate.last_name,
    candidate.email,
    candidate.phone,
    candidate.date_of_birth,
    candidate.city,
    candidate.country,
    candidate.linkedin_url,
    candidate.github_url,
    candidate.portfolio_url,
    candidate.about_me,
  ];
  const completion = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100);

  if (status === 'loading' && !profile) {
    return <LoadingState title="Loading your dashboard..." description="Retrieving your candidate profile." />;
  }

  if (error && !profile) {
    return <ErrorState title="Unable to load your dashboard" description={error} onRetry={() => dispatch(loadCandidateDashboard({ candidateId }))} />;
  }

  const name = [candidate.first_name, candidate.last_name].filter(Boolean).join(' ') || 'Candidate';
  const location = [candidate.city, candidate.country].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Welcome, {name}</h1>
            <p className="mt-2 text-sm text-slate-600">Here is the information saved in your candidate profile.</p>
          </div>
          <Button as={Link} to="/candidate/profile" variant="primary">Edit Profile</Button>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-blue-600" /><h2 className="text-xl font-semibold text-slate-950">Your information</h2></div>
          <div className="text-sm font-semibold text-slate-700">Profile {completion}% complete</div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${completion}%` }} /></div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Detail icon={UserRound} label="Full name" value={name} />
          <Detail icon={Mail} label="Email" value={candidate.email} />
          <Detail icon={Phone} label="Phone" value={candidate.phone} />
          <Detail icon={CalendarDays} label="Date of birth" value={candidate.date_of_birth} />
          <Detail icon={MapPin} label="Location" value={location} />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <ExternalLink icon={Linkedin} label="LinkedIn" value={candidate.linkedin_url} />
          <ExternalLink icon={Github} label="GitHub" value={candidate.github_url} />
          <ExternalLink icon={Globe} label="Portfolio" value={candidate.portfolio_url} />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">About me</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{candidate.about_me || 'No introduction added yet.'}</p>
        </div>
      </section>

      <div className="flex justify-end">
        <Button as={Link} to="/candidate/profile" variant="secondary">Complete or edit your profile</Button>
      </div>
    </div>
  );
}
