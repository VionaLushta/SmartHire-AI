import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  Eye,
  FileText,
  GraduationCap,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import EmptyState from '../../components/resume/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';
import { resumeService } from '../../services/resumeService';
import { resumeAdvisorService } from '../../services/resumeAdvisorService';
import { certificateService } from '../../services/certificateService';
import { candidateService } from '../../services/candidateService';
import { unwrapItems, unwrapResponse, clampPercent } from '../../utils/dashboard';

const emptyAnalysis = {
  overall_score: 0,
  resume_score: 0,
  cv_summary: 'Upload and analyze your CV to see a personalized summary.',
  summary: 'Your analysis will appear after a document is uploaded.',
  detected_skills: [],
  missing_skills: [],
  recommendations: [],
  career_advice: [],
  suggested_certificates: [],
  strengths: [],
  weaknesses: [],
  education: [],
  years_of_experience: 0,
};

function Card({ children, className = '' }) {
  return <section className={`rounded-[20px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] ${className}`}>{children}</section>;
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p> : null}
        <h2 className="mt-1.5 text-xl font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
        {description ? <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action || null}
    </div>
  );
}

function ProgressRing({ value, size = 142 }) {
  const safeValue = clampPercent(value);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#2563eb" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tracking-[-0.05em] text-slate-950">{safeValue}%</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">match</span>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-[-0.04em] text-slate-950">{value}</p></div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" aria-hidden="true" /></div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function Pipeline({ hasResume, hasCertificates, processing, hasResults }) {
  const steps = [
    { label: 'Upload resume', done: hasResume, icon: UploadCloud },
    { label: 'Upload certificates', done: hasCertificates, icon: Award },
    { label: 'AI parsing', done: hasResults, icon: Sparkles },
    { label: 'Skills extraction', done: hasResults, icon: Target },
    { label: 'Job matching', done: hasResults, icon: BarChart3 },
    { label: 'Results ready', done: hasResults, icon: Check },
  ];
  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-6 md:gap-0">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = processing && !step.done;
          return (
            <div key={step.label} className="relative flex items-center gap-3 md:block md:text-center">
              {index > 0 ? <div className={`absolute left-[-50%] right-[50%] top-5 hidden border-t border-dashed md:block ${step.done ? 'border-blue-300' : 'border-slate-300'}`} /> : null}
              <div className={`relative z-10 mx-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border md:mx-auto ${step.done ? 'border-blue-200 bg-blue-50 text-blue-700' : active ? 'border-amber-200 bg-amber-50 text-amber-600' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                {active ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="md:mt-3"><p className="text-xs font-semibold text-slate-800">{step.label}</p><p className="mt-1 text-[11px] text-slate-500">{step.done ? 'Complete' : active ? 'Processing' : 'Waiting'}</p></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SkillBars({ title, skills, tone = 'blue', emptyText }) {
  const color = tone === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <Card className="p-5">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <div className="mt-5 space-y-4">
        {skills.length ? skills.slice(0, 6).map((skill, index) => {
          const label = typeof skill === 'string' ? skill : skill?.name || skill?.skill || 'Skill';
          const score = clampPercent(typeof skill === 'object' ? skill.match_score ?? skill.score ?? 0 : tone === 'amber' ? 100 - index * 8 : 96 - index * 3);
          return (
            <div key={`${label}-${index}`}>
              <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate text-slate-700">{label}</span><span className="font-semibold text-slate-900">{score}%</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} /></div>
            </div>
          );
        }) : <p className="text-sm leading-6 text-slate-500">{emptyText}</p>}
      </div>
    </Card>
  );
}

function DocumentRow({ item, type, onDownload, onDelete }) {
  const fileName = item?.file_path?.split(/[\\/]/).pop() || item?.file_name || (type === 'resume' ? 'Resume document' : 'Certificate');
  const date = item?.created_at || item?.uploaded_at;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><FileText className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{fileName}</p><p className="mt-1 text-xs text-slate-500">{type === 'resume' ? 'Resume' : item?.title || 'Certificate'} {date ? `- ${new Date(date).toLocaleDateString()}` : ''}</p></div></div>
      <div className="flex shrink-0 items-center gap-1"><Button type="button" variant="ghost" size="sm" onClick={() => onDownload(item)}><Download className="mr-1.5 h-4 w-4" />Download</Button><Button type="button" variant="ghost" size="sm" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4 text-rose-500" aria-label="Delete document" /></Button></div>
    </div>
  );
}

function recommendationMatchesOwnedCertificate(recommendation, ownedCertificates) {
  const ignoredWords = new Set(['advanced', 'certificate', 'certification', 'certified', 'fundamentals', 'institute', 'and', 'the']);
  const recommendationWords = String(recommendation || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !ignoredWords.has(word));

  return ownedCertificates.some((certificate) => {
    const certificateText = String(certificate?.title || '').toLowerCase();
    return recommendationWords.some((word) => certificateText.includes(word));
  });
}

export default function ResumePage() {
  const resumeInputRef = useRef(null);
  const [resumeItems, setResumeItems] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [analysis, setAnalysis] = useState(emptyAnalysis);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [matching, setMatching] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function refreshAnalysis() {
    if (!selectedResume) return;
    setMatching(true);
    setNotice('AI is analyzing your documents and refreshing job matches...');
    try {
      const report = await resumeAdvisorService.regenerate();
      setAnalysis(unwrapResponse(report) || emptyAnalysis);
      const dashboardResponse = await candidateService.dashboard();
      setRecommendedJobs(unwrapResponse(dashboardResponse)?.recommended_jobs || []);
      setNotice('Analysis complete. Your latest skills and matches are ready.');
    } catch (requestError) {
      setNotice(requestError?.response?.data?.detail || 'The analysis could not be completed yet.');
    } finally {
      setMatching(false);
    }
  }

  useEffect(() => {
    async function loadWorkspace() {
      try {
        setLoading(true);
        const [resumeResult, certificateResult, dashboardResult, profileResult] = await Promise.allSettled([
          resumeService.list(),
          certificateService.list(),
          candidateService.dashboard(),
          candidateService.profile(),
        ]);
        if (resumeResult.status === 'rejected') throw resumeResult.reason;
        const items = unwrapItems(resumeResult.value);
        setResumeItems(items);
        setSelectedResume(items[0] || null);
        setCertificates(certificateResult.status === 'fulfilled' ? unwrapItems(certificateResult.value) : []);
        setRecommendedJobs(dashboardResult.status === 'fulfilled' ? unwrapResponse(dashboardResult.value)?.recommended_jobs || [] : []);
        setCandidateProfile(profileResult.status === 'fulfilled' ? unwrapResponse(profileResult.value) : null);
        if (items.length) {
          const report = await resumeAdvisorService.report().catch(() => null);
          if (report) setAnalysis(unwrapResponse(report) || emptyAnalysis);
        }
      } catch (requestError) {
        setError(requestError?.response?.data?.detail || 'Unable to load the resume workspace.');
      } finally {
        setLoading(false);
      }
    }
    loadWorkspace();
  }, []);

  async function handleUpload(file) {
    if (!file) return;
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await resumeService.upload(formData);
      const items = unwrapItems(await resumeService.list());
      const nextResume = unwrapResponse(response) || items[0] || null;
      setResumeItems(items);
      setSelectedResume(nextResume);
      setNotice('Resume uploaded. Starting automatic analysis...');
      const report = await resumeAdvisorService.regenerate();
      setAnalysis(unwrapResponse(report) || emptyAnalysis);
      const dashboardResponse = await candidateService.dashboard();
      setRecommendedJobs(unwrapResponse(dashboardResponse)?.recommended_jobs || []);
      setNotice('Resume uploaded and analyzed successfully.');
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    handleUpload(event.dataTransfer.files?.[0]);
  }

  async function handleCertificateUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const formData = new FormData();
    formData.append('title', file.name.replace(/\.[^.]+$/, ''));
    formData.append('file', file);
    try {
      await certificateService.create(formData);
      setCertificates(unwrapItems(await certificateService.list()));
      setNotice('Certificate uploaded. Refreshing your analysis...');
      await refreshAnalysis();
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || requestError?.message || 'Unable to upload certificate.');
    }
  }

  async function handleDeleteResume(item) {
    try {
      await resumeService.remove(item.resume_id);
      const items = unwrapItems(await resumeService.list());
      setResumeItems(items);
      setSelectedResume(items[0] || null);
      setAnalysis(items.length ? analysis : emptyAnalysis);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Unable to delete the resume.');
    }
  }

  async function handleDeleteCertificate(item) {
    try {
      await certificateService.remove(item.cert_id);
      setCertificates((current) => current.filter((certificate) => certificate.cert_id !== item.cert_id));
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Unable to delete certificate.');
    }
  }

  async function downloadDocument(service, item, fallbackName) {
    try {
      const response = await service.download(item.resume_id || item.cert_id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file_path?.split(/[\\/]/).pop() || fallbackName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || 'Unable to download document.');
    }
  }

  const detectedSkills = Array.isArray(analysis.detected_skills) ? analysis.detected_skills : [];
  const missingSkills = Array.isArray(analysis.missing_skills) ? analysis.missing_skills : [];
  const overallScore = clampPercent(analysis.overall_score ?? analysis.resume_score);
  const topJob = recommendedJobs[0];
  const topJobScore = clampPercent(topJob?.overall_score ?? topJob?.ai_score ?? topJob?.match_score ?? overallScore);
  const profileFields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'city', 'country', 'linkedin_url', 'github_url', 'portfolio_url', 'about_me'];
  const profileCompletion = candidateProfile ? Math.round((profileFields.filter((field) => candidateProfile[field]).length / profileFields.length) * 100) : 0;
  const strongSkills = detectedSkills;
  const suggestedSkills = missingSkills.length ? missingSkills : (analysis.recommendations || []).slice(0, 6);
  const learningRecommendations = (analysis.suggested_certificates || []).filter(
    (recommendation) => !recommendationMatchesOwnedCertificate(recommendation, certificates),
  ).slice(0, 4);
  const summary = analysis.cv_summary || analysis.summary || emptyAnalysis.cv_summary;

  if (loading) return <LoadingState title="Loading Resume & AI Analysis..." description="Preparing your documents, skills and career matches." />;
  if (error && !resumeItems.length && !selectedResume) return <ErrorState title="Unable to load Resume & AI Analysis" description={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="min-h-full space-y-6 bg-[#f7f8fc] pb-10">
      <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-600">Candidate workspace</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">Resume &amp; AI Analysis</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Upload your documents and let AI identify your strengths, gaps and best career matches.</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={refreshAnalysis} loading={matching} disabled={!selectedResume}><RefreshCw className="mr-2 h-4 w-4" />Refresh analysis</Button><Button as={Link} to="/jobs" variant="primary">Browse jobs</Button></div>
      </header>

      <Pipeline hasResume={Boolean(selectedResume)} hasCertificates={certificates.length > 0} processing={uploading || matching} hasResults={Boolean(selectedResume && (analysis.resume_score || analysis.overall_score || detectedSkills.length))} />

      {error ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button></div> : null}
      {notice ? <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">{notice}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Target} label="Overall match score" value={`${overallScore}%`} hint={overallScore >= 80 ? 'Excellent candidate signal' : selectedResume ? 'Run analysis for your score' : 'Upload a CV to begin'} tone="emerald" />
        <StatCard icon={Sparkles} label="Detected skills" value={detectedSkills.length} hint="Skills found across your documents" tone="blue" />
        <StatCard icon={BriefcaseBusiness} label="Available matches" value={recommendedJobs.length} hint="Published roles in your match list" tone="violet" />
        <StatCard icon={BarChart3} label="Best match" value={topJob ? `${topJobScore}%` : '-'} hint={topJob?.title || 'No role match yet'} tone="amber" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <main className="space-y-6">
          <Card className="p-6">
            <SectionHeading eyebrow="Documents" title="Upload your resume and certificates" description="Keep your career documents in one place. A new upload automatically refreshes your AI analysis." />
            <div
              className={`mt-6 rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-9 ${dragging ? 'border-blue-600 bg-blue-100/70' : 'border-blue-200 bg-blue-50/40'}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm"><UploadCloud className="h-7 w-7" /></div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Drop your CV here</h3><p className="mt-1 text-sm text-slate-500">PDF or DOCX, up to the supported file size</p>
              <label className="mt-5 inline-flex cursor-pointer items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(37,99,235,0.2)] transition hover:bg-blue-700"><UploadCloud className="mr-2 h-4 w-4" />{selectedResume ? 'Replace resume' : 'Upload resume'}<input ref={resumeInputRef} className="hidden" type="file" accept=".pdf,.docx" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; handleUpload(file); }} disabled={uploading} /></label>
              {uploading ? <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />Uploading and analyzing...</p> : null}
            </div>
            {selectedResume ? <div className="mt-4"><DocumentRow item={selectedResume} type="resume" onDownload={(item) => downloadDocument(resumeService, item, 'resume')} onDelete={handleDeleteResume} /></div> : null}
          </Card>

          <Card className="p-6">
            <SectionHeading eyebrow="Certificates" title="Professional credentials" description="Certificates add useful evidence to your candidate profile and match score." action={<label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Award className="mr-2 h-4 w-4 text-blue-600" />Upload certificate<input className="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleCertificateUpload} /></label>} />
            <div className="mt-5 space-y-3">{certificates.length ? certificates.map((item) => <DocumentRow key={item.cert_id} item={item} type="certificate" onDownload={(certificate) => downloadDocument(certificateService, certificate, 'certificate')} onDelete={handleDeleteCertificate} />) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No certificates uploaded yet.</div>}</div>
          </Card>

          <Card className="p-6">
            <SectionHeading eyebrow="AI processing" title="Document processing status" description="Your analysis is built from the resume and certificates currently stored in your account." />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{[
              ['Reading resume', Boolean(selectedResume)],
              ['Reading certificates', certificates.length > 0],
              ['Extracting skills', detectedSkills.length > 0],
              ['Analyzing experience', Boolean(analysis.years_of_experience || analysis.education?.length)],
              ['Calculating job match', recommendedJobs.length > 0],
              ['Results ready', Boolean(selectedResume && (analysis.resume_score || detectedSkills.length))],
            ].map(([label, done]) => <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm"><span className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400'}`}>{done ? <Check className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}</span><span className={done ? 'font-medium text-slate-800' : 'text-slate-500'}>{label}</span><span className="ml-auto text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{done ? 'Done' : 'Waiting'}</span></div>)}</div>
          </Card>

          <Card className="p-6">
            <SectionHeading eyebrow="Documents" title="Resume preview" action={selectedResume ? <Button type="button" variant="secondary" size="sm" onClick={() => resumeInputRef.current?.click()}><RefreshCw className="mr-1.5 h-4 w-4" />Replace</Button> : null} />
            {selectedResume ? <div className="mt-5 flex min-h-52 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm"><Eye className="h-6 w-6" /></div><p className="mt-4 font-semibold text-slate-800">Preview is ready for download</p><p className="mt-1 text-sm text-slate-500">Browser preview is unavailable for this document type.</p><Button type="button" variant="primary" size="sm" className="mt-4" onClick={() => downloadDocument(resumeService, selectedResume, 'resume')}><Download className="mr-2 h-4 w-4" />Download resume</Button></div> : <EmptyState title="No resume uploaded" description="Upload a resume to generate your analysis." />}
          </Card>
        </main>

        <aside className="space-y-6">
          <Card className="p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Overall match</p><h2 className="mt-1 text-xl font-semibold text-slate-950">Your career signal</h2></div><Sparkles className="h-5 w-5 text-blue-600" /></div><div className="mt-6 flex flex-col items-center"><ProgressRing value={overallScore} /><p className="mt-4 text-lg font-semibold text-emerald-600">{overallScore >= 80 ? 'Excellent candidate' : overallScore >= 60 ? 'Strong foundation' : 'Build your profile'}</p><p className="mt-1 text-center text-sm leading-6 text-slate-500">{selectedResume ? 'Based on your uploaded documents and current match data.' : 'Upload a CV to calculate your score.'}</p></div></Card>
          <SkillBars title="Strong skills" skills={strongSkills} emptyText="Detected skills will appear after your CV is analyzed." />
          <SkillBars title="Skills to improve" skills={suggestedSkills} tone="amber" emptyText="No improvement areas identified yet." />
          <Card className="p-5"><div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-blue-600" /><h3 className="text-base font-semibold text-slate-950">AI summary</h3></div><p className="mt-4 text-sm leading-7 text-slate-600">{summary}</p><Button type="button" variant="secondary" size="sm" className="mt-5" onClick={refreshAnalysis} loading={matching} disabled={!selectedResume}>Refresh summary</Button></Card>
          <Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Profile completion</p><p className="mt-1 text-2xl font-bold text-slate-950">{profileCompletion}%</p></div><Link to="/candidate/profile" className="text-sm font-semibold text-blue-700 hover:underline">View profile</Link></div><div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${profileCompletion}%` }} /></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500"><span>Resume {selectedResume ? 'ready' : 'missing'}</span><span>Certificates {certificates.length}</span><span>Skills {detectedSkills.length}</span><span>Experience {analysis.years_of_experience || 0} yrs</span></div></Card>
          <Card className="p-5"><div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-blue-600" /><h3 className="text-base font-semibold text-slate-950">Recommended learning</h3></div><div className="mt-4 space-y-3">{learningRecommendations.map((item) => <div key={item} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5"><span className="text-sm text-slate-700">{item}</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-400" /></div>)}{!learningRecommendations.length ? <p className="text-sm leading-6 text-slate-500">No new certificate recommendations. Your existing credentials already cover these areas.</p> : null}</div></Card>
        </aside>
      </div>

      <Card className="p-6"><SectionHeading eyebrow="Job match engine" title="Top recommended jobs" description="Roles are ordered using the match data returned by the existing backend recommendation service." action={<Button as={Link} to="/jobs" variant="secondary" size="sm">View all jobs</Button>} /><div className="mt-5 grid gap-3 lg:grid-cols-2">{recommendedJobs.length ? recommendedJobs.slice(0, 6).map((job) => { const score = clampPercent(job.overall_score ?? job.ai_score ?? job.match_score ?? 0); const jobId = job.job_id || job.id; return <article key={jobId || job.title} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-950">{job.title || 'Recommended role'}</h3><p className="mt-1 text-sm text-slate-500">{job.company_name || 'SmartHire opportunity'}</p></div><span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">{score}%</span></div><div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location || 'Remote'}</span><span className="inline-flex items-center gap-1"><BriefcaseBusiness className="h-3.5 w-3.5" />{job.employment_type || 'Full-time'}</span>{job.salary_min || job.salary_max ? <span className="inline-flex items-center gap-1"><CircleDollarSign className="h-3.5 w-3.5" />{job.salary_min || ''}{job.salary_max ? ` - ${job.salary_max}` : ''}</span> : null}</div>{jobId ? <Button as={Link} to={`/jobs/${jobId}/apply`} variant="primary" size="sm" className="mt-4">Apply now</Button> : null}</article>; }) : <div className="lg:col-span-2"><EmptyState title="No job matches yet" description="Upload and analyze your CV to see the roles that best fit your profile." /></div>}</div></Card>

      <Card className="p-6"><SectionHeading eyebrow="History" title="Previous resume uploads" description="The selected document is marked as active. Choose another version when needed." /><div className="mt-5 space-y-3">{resumeItems.length > 0 ? resumeItems.map((item) => { const isActive = item.resume_id === selectedResume?.resume_id; return <div key={item.resume_id} className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${isActive ? 'border-blue-300 bg-blue-50/60 shadow-[0_4px_16px_rgba(37,99,235,0.08)]' : 'border-slate-200 bg-white'}`}><div className="flex items-center gap-3"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-50 text-blue-600'}`}><FileText className="h-5 w-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-slate-900">{item.file_path?.split(/[\\/]/).pop() || 'Resume document'}</p>{isActive ? <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">Active</span> : null}</div><p className="mt-1 text-xs text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Uploaded recently'}</p></div></div><div className="flex gap-2"><Button type="button" variant={isActive ? 'secondary' : 'ghost'} size="sm" onClick={() => setSelectedResume(item)} disabled={isActive}>{isActive ? <Check className="mr-1.5 h-4 w-4 text-blue-600" /> : <Eye className="mr-1.5 h-4 w-4" />}{isActive ? 'Active' : 'Open'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteResume(item)}><Trash2 className="h-4 w-4 text-rose-500" /></Button></div></div>; }) : <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">No resume history yet.</div>}</div></Card>
    </div>
  );
}
