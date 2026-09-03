import { CalendarDays, CheckCircle2, Github, Globe, Linkedin, Mail, MapPin, Phone, Save, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/jobs/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import { loadCandidateDashboard, updateCandidateProfile } from '../../redux/slices/candidateSlice';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  city: '',
  country: '',
  linkedin_url: '',
  github_url: '',
  portfolio_url: '',
  about_me: '',
};

function Field({ icon: Icon, label, className, ...props }) {
  return (
    <div className="relative">
      <Input
        label={label}
        className={className || (props.disabled ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : '')}
        {...props}
      />
      {Icon ? <Icon className="pointer-events-none absolute right-3 top-9 h-4 w-4 text-slate-400" aria-hidden="true" /> : null}
    </div>
  );
}

function buildForm(source = {}) {
  return {
    ...emptyForm,
    first_name: source.first_name || '',
    last_name: source.last_name || '',
    email: source.email || '',
    phone: source.phone || '',
    date_of_birth: source.date_of_birth || '',
    city: source.city || '',
    country: source.country || '',
    linkedin_url: source.linkedin_url || '',
    github_url: source.github_url || '',
    portfolio_url: source.portfolio_url || '',
    about_me: source.about_me || '',
  };
}

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { profile, status, error } = useSelector((state) => state.candidate);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (user?.user_id) dispatch(loadCandidateDashboard({ candidateId: user.user_id }));
  }, [dispatch, user?.user_id]);

  useEffect(() => {
    setForm(buildForm(profile || user || {}));
  }, [profile, user]);

  const completion = useMemo(() => {
    const fields = [
      form.first_name,
      form.last_name,
      form.email,
      form.phone,
      form.date_of_birth,
      form.city,
      form.country,
      form.linkedin_url,
      form.github_url,
      form.portfolio_url,
      form.about_me,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [form]);

  const candidateFirstName = form.first_name || user?.first_name || 'Candidate';

  function updateField(name) {
    return (event) => {
      setSaved(false);
      setForm((current) => ({ ...current, [name]: event.target.value }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaved(false);
    setSaveError('');
    try {
      await dispatch(updateCandidateProfile({
        ...form,
        email: form.email || null,
        phone: form.phone || null,
        date_of_birth: form.date_of_birth || null,
        city: form.city || null,
        country: form.country || null,
        linkedin_url: form.linkedin_url || null,
        github_url: form.github_url || null,
        portfolio_url: form.portfolio_url || null,
        about_me: form.about_me || null,
      })).unwrap();
      setSaved(true);
      setEditing(false);
    } catch (requestError) {
      setSaveError(typeof requestError === 'string' ? requestError : 'Profile could not be saved.');
    }
  }

  if (status === 'loading' && !profile) {
    return <LoadingState title="Loading your profile..." description="Retrieving your saved candidate information." />;
  }

  if (error && !profile) {
    return <ErrorState title="Unable to load your profile" description={error} onRetry={() => dispatch(loadCandidateDashboard({ candidateId: user?.user_id }))} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Welcome, {candidateFirstName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Manage your candidate profile and keep your professional details up to date.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-40 rounded-2xl bg-slate-950 p-4 text-white">
              <div className="flex items-center justify-between text-sm"><span>Profile progress</span><span className="font-semibold">{completion}%</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${completion}%` }} /></div>
            </div>
            <Button type="button" variant={editing ? 'secondary' : 'primary'} onClick={() => { if (editing) setForm(buildForm(profile || user || {})); setEditing((value) => !value); setSaved(false); setSaveError(''); }}>
              {editing ? 'Cancel edit' : 'Edit Profile'}
            </Button>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3"><UserRound className="h-5 w-5 text-blue-600" /><div><h2 className="text-xl font-semibold text-slate-950">Basic information</h2><p className="mt-1 text-sm text-slate-500">Your main personal and contact details.</p></div></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="First name" value={form.first_name} onChange={updateField('first_name')} required disabled={!editing} />
            <Field label="Last name" value={form.last_name} onChange={updateField('last_name')} required disabled={!editing} />
            <Field icon={Mail} label="Email" type="email" value={form.email} onChange={updateField('email')} required disabled={!editing} />
            <Field icon={Phone} label="Phone number" value={form.phone} onChange={updateField('phone')} placeholder="+383 ..." disabled={!editing} />
            <Field icon={CalendarDays} label="Date of birth" type="date" value={form.date_of_birth} onChange={updateField('date_of_birth')} disabled={!editing} />
            <Field icon={MapPin} label="City" value={form.city} onChange={updateField('city')} disabled={!editing} />
            <Field label="Country" value={form.country} onChange={updateField('country')} disabled={!editing} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3"><Globe className="h-5 w-5 text-blue-600" /><div><h2 className="text-xl font-semibold text-slate-950">Professional links</h2><p className="mt-1 text-sm text-slate-500">These links help employers see your work and experience.</p></div></div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field icon={Linkedin} label="LinkedIn URL" type="url" value={form.linkedin_url} onChange={updateField('linkedin_url')} placeholder="https://linkedin.com/in/..." disabled={!editing} />
            <Field icon={Github} label="GitHub URL" type="url" value={form.github_url} onChange={updateField('github_url')} placeholder="https://github.com/..." disabled={!editing} />
            <div className="md:col-span-2"><Field icon={Globe} label="Portfolio URL" type="url" value={form.portfolio_url} onChange={updateField('portfolio_url')} placeholder="https://your-portfolio.com" disabled={!editing} /></div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-slate-950">About me</h2>
          <p className="mt-1 text-sm text-slate-500">Write a short introduction about your experience, strengths and goals.</p>
          <textarea value={form.about_me} onChange={updateField('about_me')} maxLength={4000} rows={6} placeholder="Tell recruiters a little about yourself..." disabled={!editing} className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-600" />
          <p className="mt-2 text-right text-xs text-slate-400">{form.about_me.length}/4000</p>
        </section>

        {editing ? <div className="flex flex-col items-stretch justify-end gap-3 sm:flex-row sm:items-center">
          {saved ? <p className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Profile saved successfully.</p> : null}
          {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
          <Button type="submit" variant="primary" loading={status === 'saving'}><Save className="mr-2 h-4 w-4" /> Save changes</Button>
        </div> : null}
      </form>
    </div>
  );
}
