import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Linkedin,
  MapPin,
  Sparkles,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/jobs/LoadingState';
import { candidateService } from '../../services/candidateService';
import { certificateService } from '../../services/certificateService';
import { applicationService } from '../../services/applicationService';
import { resumeService } from '../../services/resumeService';
import { fetchJobById } from '../../redux/slices/jobSlice';
import { useDispatch, useSelector } from 'react-redux';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';

function formatApplicationError(error) {
  const status = error?.response?.status;
  const detail =
    error?.response?.data?.detail ||
    error?.message ||
    'Something went wrong while submitting your application.';

  if (status === 401) return 'Please log in to continue.';
  if (status === 403) return "You don't have permission to perform this action.";
  if (status === 404) return 'This job is no longer available.';
  if (status === 409) return 'You have already applied for this position.';
  if (status === 422) return detail;
  if (status >= 500) return 'Something went wrong while submitting your application.';
  return detail;
}

function normalizePathName(value) {
  return String(value || '').split(/[\\/]/).pop() || 'File';
}

export default function JobApplyPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { selectedJob, selectedJobStatus, selectedJobError } = useSelector((state) => state.jobs);

  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    cover_letter: '',
    additional_notes: '',
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [certificateFiles, setCertificateFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchJobById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      setLoading(true);
      try {
        const [profileResult, resumeResult, certificateResult, applicationResult] = await Promise.allSettled([
          candidateService.profile(),
          resumeService.list(),
          certificateService.list(),
          applicationService.list(),
        ]);

        if (!mounted) return;

        const profilePayload = unwrapResponse(profileResult.status === 'fulfilled' ? profileResult.value : null);
        const resumePayload = unwrapItems(resumeResult.status === 'fulfilled' ? resumeResult.value : null);
        const certificatePayload = unwrapItems(
          certificateResult.status === 'fulfilled' ? certificateResult.value : null,
        );
        const applicationPayload = unwrapItems(
          applicationResult.status === 'fulfilled' ? applicationResult.value : null,
        );

        setResumes(resumePayload);
        setCertificates(certificatePayload);
        setApplications(applicationPayload);
        setForm({
          first_name: profilePayload?.first_name || user?.first_name || '',
          last_name: profilePayload?.last_name || user?.last_name || '',
          email: profilePayload?.email || user?.email || '',
          phone: profilePayload?.phone || user?.phone || '',
          city: profilePayload?.city || '',
          linkedin_url: profilePayload?.linkedin_url || '',
          github_url: profilePayload?.github_url || '',
          portfolio_url: profilePayload?.portfolio_url || '',
          cover_letter: '',
          additional_notes: '',
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadWorkspace();

    return () => {
      mounted = false;
    };
  }, [user?.email, user?.first_name, user?.last_name, user?.phone]);

  const latestResume = useMemo(
    () => resumes[0] || null,
    [resumes],
  );

  const jobTitle = selectedJob?.title || 'Job opportunity';
  const department = selectedJob?.department_name || 'General';
  const location = selectedJob?.location || 'Remote';
  const deadline = selectedJob?.deadline || 'Open';
  const isPublicJob = ['active', 'open'].includes(String(selectedJob?.status || '').toLowerCase());
  const alreadyApplied = useMemo(
    () => applications.some((application) => String(application.job_id) === String(id)),
    [applications, id],
  );

  useEffect(() => {
    if (alreadyApplied) {
      setError('You have already applied for this position.');
    }
  }, [alreadyApplied]);

  const profileSummary = [
    { label: 'Name', value: [form.first_name, form.last_name].filter(Boolean).join(' ') || 'Not added yet', icon: UserRound },
    { label: 'Email', value: form.email || 'Not added yet', icon: FileText },
    { label: 'Location', value: form.city || 'Not added yet', icon: MapPin },
    { label: 'LinkedIn', value: form.linkedin_url || 'Not added yet', icon: Linkedin },
  ];

  if (selectedJobStatus === 'loading' || (!selectedJob && !selectedJobError)) {
    return (
      <LoadingState
        title="Loading application..."
        description="Retrieving the job details and your candidate profile."
      />
    );
  }

  if (selectedJobError) {
    return (
      <ErrorState
        title="Unable to open this application"
        description={selectedJobError}
        onRetry={() => dispatch(fetchJobById(id))}
      />
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess(null);

    if (!isPublicJob) {
      setError('This position is no longer accepting applications.');
      return;
    }

    if (alreadyApplied) {
      setError('You have already applied for this position.');
      return;
    }

    try {
      setSubmitting(true);

      await candidateService.update({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        linkedin_url: form.linkedin_url || null,
        github_url: form.github_url || null,
        portfolio_url: form.portfolio_url || null,
      });

      let resumeId = latestResume?.resume_id || null;
      if (resumeFile) {
        const resumeFormData = new FormData();
        resumeFormData.append('file', resumeFile);
        const resumeResponse = await resumeService.upload(resumeFormData);
        resumeId = unwrapResponse(resumeResponse)?.resume_id || resumeId;
        const refreshedResumes = await resumeService.list();
        setResumes(unwrapItems(refreshedResumes));
      }

      for (const certificateFile of certificateFiles) {
        const certificateFormData = new FormData();
        certificateFormData.append('title', normalizePathName(certificateFile.name).replace(/\.[^.]+$/, '') || 'Certificate');
        certificateFormData.append('issuer', 'SmartHire AI');
        certificateFormData.append('issue_date', new Date().toISOString().slice(0, 10));
        certificateFormData.append('file', certificateFile);
        await certificateService.create(certificateFormData);
      }
      if (certificateFiles.length) {
        const refreshedCertificates = await certificateService.list();
        setCertificates(unwrapItems(refreshedCertificates));
      }

      if (!resumeId) {
        throw new Error('A resume is required before submitting your application.');
      }

      const applicationText = [
        form.cover_letter.trim(),
        form.additional_notes.trim() ? `Additional notes:\n${form.additional_notes.trim()}` : '',
      ].filter(Boolean).join('\n\n');
      const response = await applicationService.create({
        job_id: Number(id),
        resume_id: resumeId,
        cover_letter: applicationText || null,
      });
      const created = unwrapResponse(response);
      setApplications((current) => [created, ...current]);
      setSuccess(created);
      window.dispatchEvent(new CustomEvent('application:created', { detail: created }));
    } catch (submitError) {
      setError(formatApplicationError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LoadingState
        title="Preparing your application..."
        description="Loading your candidate details, attachments, and application history."
      />
    );
  }

  if (success) {
    return (
      <div className="space-y-8 pb-10">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Application submitted successfully
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
            Your application for {jobTitle} is now pending review.
          </h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-7 text-slate-600">
            We saved your submission, linked it to your candidate profile, and triggered the AI evaluation automatically.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/candidate/dashboard" variant="primary">
              View Dashboard
            </Button>
            <Button as={Link} to="/jobs" variant="secondary">
              Browse More Jobs
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-8 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Apply for</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">{jobTitle}</h1>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <BriefcaseBusiness className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {department}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <MapPin className="h-4 w-4 text-slate-400" aria-hidden="true" />
              {location}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <Sparkles className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Deadline {String(deadline)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 md:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700">
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Candidate details
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Tell us about yourself
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input label="First Name" value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} required />
                <Input label="Last Name" value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} required />
                <Input label="Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                <Input label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
                <Input label="City" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
                <Input label="LinkedIn" value={form.linkedin_url} onChange={(event) => setForm((current) => ({ ...current, linkedin_url: event.target.value }))} placeholder="https://linkedin.com/in/..." />
                <Input label="GitHub" value={form.github_url} onChange={(event) => setForm((current) => ({ ...current, github_url: event.target.value }))} placeholder="https://github.com/..." />
                <Input label="Portfolio" value={form.portfolio_url} onChange={(event) => setForm((current) => ({ ...current, portfolio_url: event.target.value }))} placeholder="https://your-portfolio.com" />
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700">
                  <UploadCloud className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Documents
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Resume and certificate upload
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Resume Upload</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                    className="block w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-slate-500">
                    {resumeFile ? `Selected: ${resumeFile.name}` : latestResume ? `Existing resume: ${normalizePathName(latestResume.file_path)}` : 'Upload a PDF resume to continue.'}
                  </p>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Certificate Upload</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    multiple
                    onChange={(event) => setCertificateFiles(Array.from(event.target.files || []))}
                    className="block w-full rounded-[14px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  <p className="text-xs text-slate-500">
                    {certificateFiles.length ? `${certificateFiles.length} certificate(s) selected` : `${certificates.length} certificate(s) already saved`}
                  </p>
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Cover letter
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Add a short note for the recruiter
                  </h2>
                </div>
              </div>

              <textarea
                rows={7}
                value={form.cover_letter}
                onChange={(event) => setForm((current) => ({ ...current, cover_letter: event.target.value }))}
                placeholder="Introduce yourself, explain why this role fits you, and mention anything the team should know."
                className="mt-6 w-full rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
              />
              <label htmlFor="additional-notes" className="mt-5 block text-sm font-medium text-slate-700">Additional notes</label>
              <textarea
                id="additional-notes"
                rows={4}
                value={form.additional_notes}
                onChange={(event) => setForm((current) => ({ ...current, additional_notes: event.target.value }))}
                placeholder="Anything else you would like the hiring team to know?"
                className="mt-2 w-full rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
              />
            </section>

            {error ? (
              <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={submitting || alreadyApplied || !isPublicJob}
                loading={submitting}
              >
                Submit Application
              </Button>
              <Button as={Link} to={`/jobs/${id}`} variant="secondary" className="w-full sm:w-auto">
                Back to job details
              </Button>
            </div>

            <p className="text-xs leading-6 text-slate-500">
              Submitting will update your candidate profile, persist your resume and certificate uploads, create a pending application, and run AI matching automatically.
            </p>
          </form>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Application preview</h2>
              <div className="mt-5 space-y-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {profileSummary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between gap-4">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        {item.label}
                      </span>
                      <span className="font-medium text-slate-950">{item.value}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Job snapshot</h2>
              <dl className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <dt>Department</dt>
                  <dd className="font-medium text-slate-950">{department}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Location</dt>
                  <dd className="font-medium text-slate-950">{location}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Deadline</dt>
                  <dd className="font-medium text-slate-950">{String(deadline)}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Existing resumes</dt>
                  <dd className="font-medium text-slate-950">{resumes.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt>Existing certificates</dt>
                  <dd className="font-medium text-slate-950">{certificates.length}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">What happens next</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>Your application is saved to the backend.</p>
                <p>The candidate dashboard and admin application views refresh from live data.</p>
                <p>AI evaluation runs automatically and writes the match score, strengths, missing skills, and recommendation.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
