import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartNoAxesCombined } from 'lucide-react';
import ResumePreview from '../../components/resume/ResumePreview';
import ResumeHistory from '../../components/resume/ResumeHistory';
import ResumeScore from '../../components/resume/ResumeScore';
import SkillBadge from '../../components/resume/SkillBadge';
import SuggestionCard from '../../components/resume/SuggestionCard';
import InsightCard from '../../components/resume/InsightCard';
import ProgressBar from '../../components/resume/ProgressBar';
import EmptyState from '../../components/resume/EmptyState';
import LoadingState from '../../components/jobs/LoadingState';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import { resumeService } from '../../services/resumeService';
import { resumeAdvisorService } from '../../services/resumeAdvisorService';
import { certificateService } from '../../services/certificateService';
import { candidateService } from '../../services/candidateService';
import { unwrapItems, unwrapResponse, clampPercent } from '../../utils/dashboard';

const defaultRecommendation = {
  overall_score: 0,
  resume_score: 0,
  cv_summary: 'Upload and analyze your CV to see your profile score.',
  summary: 'Analysis will appear after a resume is uploaded and processed.',
  detected_skills: [],
  education: [],
  certifications: [],
  years_of_experience: 0,
  strengths: [],
  weaknesses: [],
  missing_skills: [],
  recommendations: [],
  career_insights: {},
};

function formatResumeLabel(resume) {
  return resume?.file_path?.split(/[\\/]/).pop() || resume?.file_name || 'Uploaded CV';
}

function normalizeSkill(skill) {
  return String(typeof skill === 'string' ? skill : skill?.name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function jobMatchScore(job, candidateSkills) {
  const required = [...(job.required_skills || []), ...(job.skills || [])]
    .map((skill) => String(skill).toLowerCase())
    .filter((skill, index, list) => skill && list.indexOf(skill) === index);
  if (!required.length) return null;
  const profile = (Array.isArray(candidateSkills) ? candidateSkills : []).map((skill) => String(skill).toLowerCase());
  const matches = required.filter((skill) => profile.some((candidateSkill) => candidateSkill.includes(skill) || skill.includes(candidateSkill)));
  return Math.round((matches.length / required.length) * 100);
}

export default function ResumePage() {
  const [resumeItems, setResumeItems] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState(defaultRecommendation);
  const [certificates, setCertificates] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matchMessage, setMatchMessage] = useState('');
  const [error, setError] = useState(null);

  const previewUrl = useMemo(() => {
    if (!selectedResume?.file_path) return '';
    return '';
  }, [selectedResume]);

  useEffect(() => {
    async function loadResumes() {
      try {
        setLoading(true);
        const [resumeResult, certificateResult, dashboardResult] = await Promise.allSettled([
          resumeService.list(),
          certificateService.list(),
          candidateService.dashboard(),
        ]);
        if (resumeResult.status === 'rejected') throw resumeResult.reason;
        const items = unwrapItems(resumeResult.value);
        setResumeItems(items);
        setSelectedResume(items[0] || null);
        setCertificates(certificateResult.status === 'fulfilled' ? unwrapItems(certificateResult.value) : []);
        setRecommendedJobs(dashboardResult.status === 'fulfilled' ? unwrapResponse(dashboardResult.value)?.recommended_jobs || [] : []);
        if (items.length) {
          try {
            const report = await resumeAdvisorService.report();
            setAnalysis(unwrapResponse(report) || defaultRecommendation);
          } catch {
            // A missing advisor report should not hide an uploaded resume.
          }
        }
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load resumes.');
      } finally {
        setLoading(false);
      }
    }

    loadResumes();
  }, []);

  async function handleUpload(file) {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await resumeService.upload(formData);
      const nextResume = unwrapResponse(response);
      const refreshed = await resumeService.list();
      const items = unwrapItems(refreshed);
      setResumeItems(items);
      setSelectedResume(nextResume || items[0] || null);
      try {
        const report = await resumeAdvisorService.report();
        setAnalysis(unwrapResponse(report) || defaultRecommendation);
      } catch {
        // The resume remains uploaded even if analysis is temporarily unavailable.
      }
      setError(null);
      setMatchMessage('CV uploaded. Click Show Match % to analyze your profile.');
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
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
      setMatchMessage('Certificate uploaded. Click Show Match % to refresh your result.');
      setError(null);
    } catch (uploadError) {
      setError(uploadError?.response?.data?.detail || uploadError?.message || 'Unable to upload certificate.');
    }
  }

  async function handleMatch() {
    if (!selectedResume) return;
    try {
      setMatching(true);
      setMatchMessage('Analyzing your CV and certificates...');
      const report = await resumeAdvisorService.regenerate();
      setAnalysis(unwrapResponse(report) || defaultRecommendation);
      try {
        const dashboardResponse = await candidateService.dashboard();
        setRecommendedJobs(unwrapResponse(dashboardResponse)?.recommended_jobs || []);
      } catch {
        // Keep the analysis visible when recommendations are temporarily unavailable.
      }
      setMatchMessage('Analysis complete. Your best matching positions are shown below.');
    } catch (matchError) {
      setMatchMessage(matchError?.response?.data?.detail || 'The CV could not be analyzed yet.');
    } finally {
      setMatching(false);
    }
  }

  async function handleCertificateDelete(certId) {
    try {
      await certificateService.remove(certId);
      setCertificates((items) => items.filter((item) => item.cert_id !== certId));
    } catch (deleteError) {
      setError(deleteError?.response?.data?.detail || 'Unable to delete certificate.');
    }
  }

  async function downloadCertificate(item) {
    try {
      const response = await certificateService.download(item.cert_id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.file_path?.split(/[\\/]/).pop() || 'certificate';
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError?.response?.data?.detail || 'Unable to download certificate.');
    }
  }

  async function handleDelete(resumeId) {
    try {
      await resumeService.remove(resumeId);
      setResumeItems((current) => current.filter((item) => item.resume_id !== resumeId));
      setSelectedResume((current) => (current?.resume_id === resumeId ? null : current));
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to delete the resume.');
    }
  }

  const matchedSkills = Array.isArray(analysis.detected_skills) && analysis.detected_skills.length
    ? analysis.detected_skills
    : (Array.isArray(selectedResume?.skills) ? selectedResume.skills : []);
  const detectedSkillNames = new Set(matchedSkills.map(normalizeSkill).filter(Boolean));
  const missingSkills = (Array.isArray(analysis.missing_skills) && analysis.missing_skills.length
    ? analysis.missing_skills
    : (Array.isArray(selectedResume?.missing_skills) ? selectedResume.missing_skills : []))
    .filter((skill) => !detectedSkillNames.has(normalizeSkill(skill)));

  if (loading) {
    return <LoadingState title="Loading resume workspace..." description="Preparing resume preview, history, and AI analysis." />;
  }

  if (error && !resumeItems.length && !selectedResume) {
    return (
      <ErrorState
        title="Unable to load the resume workspace"
        description={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Resume & analysis</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button as={Link} to="/profile" variant="secondary">Update profile</Button>
            <Button as={Link} to="/jobs" variant="primary">Explore roles</Button>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-blue-100 bg-blue-50/60 p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">One profile analysis</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Upload your CV and certificates</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              We use these documents to identify your skills and show which published positions are the closest fit.
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleMatch} disabled={!selectedResume} loading={matching}>
            {analysis.resume_score > 0 ? 'Refresh Match %' : 'Show Match %'}
          </Button>
        </div>
        {matchMessage ? <p className="mt-4 text-sm font-medium text-blue-800">{matchMessage}</p> : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">CV and resume</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Primary document</h2>
          <p className="mt-1 text-sm text-slate-600">Upload a PDF or DOCX file. You can replace it at any time.</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white">
              Upload CV
              <input className="hidden" type="file" accept=".pdf,.docx" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; handleUpload(file); }} disabled={uploading} />
            </label>
            {selectedResume ? <span className="text-sm text-slate-600">{formatResumeLabel(selectedResume)}</span> : <span className="text-sm text-slate-500">No CV uploaded</span>}
            {selectedResume ? <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(selectedResume.resume_id)}>Delete</Button> : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Credentials</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Certificates</h2>
              <p className="mt-1 text-sm text-slate-600">Add certificates that support your professional skills.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
              Upload
              <input className="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleCertificateUpload} />
            </label>
          </div>
          <div className="mt-5 space-y-2">
            {certificates.length ? certificates.map((item) => (
              <div key={item.cert_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{item.title || 'Certificate'}</p>
                  <p className="text-xs text-slate-500">Uploaded {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'recently'}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => downloadCertificate(item)}>Download</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleCertificateDelete(item.cert_id)}>Delete</Button>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No certificates uploaded yet.</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ResumeScore score={clampPercent(analysis.resume_score)} summary={analysis.cv_summary || analysis.summary} />

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Profile completion</p>
              <div className="mt-6 space-y-4">
                <ProgressBar value={86} label="Resume" tone="primary" />
                <ProgressBar value={78} label="Education" tone="success" />
                <ProgressBar value={65} label="Certificates" tone="warning" />
                <ProgressBar value={80} label="Skills" tone="primary" />
                <ProgressBar value={72} label="Experience" tone="success" />
                <ProgressBar value={91} label="Profile" tone="primary" />
              </div>
            </div>
          </div>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Analysis</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Skills and recommendations</h2>
              </div>
              <ChartNoAxesCombined className="h-6 w-6 text-slate-500" aria-hidden="true" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <InsightCard title="Skills found" value={matchedSkills.length} description="mapped to your current profile" />
              <InsightCard title="Missing skills" value={missingSkills.length} description="priority for target roles" />
              <InsightCard
                title="Education summary"
                value={analysis.education?.length ? `${analysis.education.length} item${analysis.education.length === 1 ? '' : 's'}` : 'Not detected'}
                description={analysis.education?.[0] || 'No education found in the CV'}
              />
              <InsightCard
                title="Experience summary"
                value={analysis.years_of_experience ? `${analysis.years_of_experience} years` : 'Not detected'}
                description={analysis.years_of_experience ? 'Calculated from your CV history' : 'No work history found in the CV'}
              />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-950">Matched skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {matchedSkills.length ? matchedSkills.map((skill) => (
                  <SkillBadge key={skill} tone="success">{skill}</SkillBadge>
                )) : <p className="text-sm text-slate-500">No technical skills detected yet. Click Refresh Match % after uploading a text-based CV.</p>}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Missing skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingSkills.length ? missingSkills.map((skill) => (
                    <SkillBadge key={skill} tone="warning">{skill}</SkillBadge>
                  )) : <p className="text-sm text-slate-500">No missing skills identified.</p>}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-950">Recommended certifications</h3>
                <p className="mt-3 text-sm text-slate-500">
                  {analysis.suggested_certificates?.length
                    ? analysis.suggested_certificates.join(', ')
                    : 'No certificate recommendations yet.'}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {selectedResume ? (
            <ResumePreview
              resume={selectedResume}
              previewUrl={previewUrl}
              onReplace={() => {}}
              onDownload={async () => {
                try {
                  const response = await resumeService.download(selectedResume.resume_id);
                  const url = URL.createObjectURL(response.data);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = selectedResume.file_path?.split(/[\\/]/).pop() || 'resume';
                  link.click();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  setError(err?.response?.data?.detail || 'Unable to download the resume.');
                }
              }}
            />
          ) : (
              <EmptyState title="No resume uploaded" description="Upload a resume to generate analysis and a preview." />
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AI suggestions</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Actionable guidance</h3>
            <div className="mt-5 space-y-3">
              {(analysis.recommendations || analysis.career_advice || []).map((item, index) => (
                <SuggestionCard
                  key={`${typeof item === 'string' ? item : item.title}-${index}`}
                  title={typeof item === 'string' ? 'AI recommendation' : item.title}
                  detail={typeof item === 'string' ? item : `${item.reason || 'Recommended next step.'}${item.estimated_score_gain ? ` Estimated gain: +${item.estimated_score_gain}%.` : ''}`}
                  tone={index === 0 ? 'primary' : 'warning'}
                />
              ))}
              {!(analysis.recommendations?.length || analysis.career_advice?.length) ? <p className="text-sm text-slate-500">No recommendations available yet. Run the match after uploading your CV.</p> : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Career advice</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Recommended next moves</h3>
            <div className="mt-5 space-y-3">
              <SuggestionCard title="Target role fit" detail={analysis.career_advice?.[0] || 'Run the match to receive role-specific advice.'} tone="success" />
              <SuggestionCard title="Next step" detail={analysis.career_advice?.[1] || 'Add more CV detail to improve the analysis.'} tone="primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <ResumeHistory
          items={resumeItems}
          onOpen={(item) => setSelectedResume(item)}
          onDelete={(resumeId) => handleDelete(resumeId)}
        />

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Resume insights</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Strengths and growth areas</h3>
          <div className="mt-5 space-y-4">
            {(analysis.strengths || []).map((item) => (
              <div key={item} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {item}
              </div>
            ))}
            {(analysis.weaknesses || []).map((item) => (
              <div key={item} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Best opportunities</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Where your profile fits best</h2>
            <p className="mt-2 text-sm text-slate-600">Positions are ranked by the skills detected in your CV.</p>
          </div>
          <Button as={Link} to="/jobs" variant="secondary">Browse all jobs</Button>
        </div>
        {recommendedJobs.length ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {recommendedJobs.slice(0, 6).map((job) => {
              const score = job.overall_score ?? job.ai_score ?? job.match_score ?? jobMatchScore(job, matchedSkills);
              const skills = (job.required_skills || job.skills || []).slice(0, 4).map((skill) => typeof skill === 'string' ? skill : skill?.name).filter(Boolean);
              const jobId = job.job_id || job.id;
              return (
                <article key={job.job_id || job.id || job.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-950">{job.title || 'Recommended position'}</h3>
                      <p className="mt-1 text-sm text-slate-600">{job.company_name || 'SmartHire opportunity'}{job.location ? ` - ${job.location}` : ''}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">{score == null ? '—' : `${clampPercent(score)}%`}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill) => <SkillBadge key={skill} tone="primary">{skill}</SkillBadge>)}
                  </div>
                  {jobId ? <Button as={Link} to={`/jobs/${jobId}`} variant="primary" size="sm" className="mt-4">View position</Button> : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No positions to compare yet" description="Published job recommendations will appear after your CV is analyzed." />
        )}
      </section>

      {error ? <ErrorState title="Resume workspace notice" description={error} /> : null}
    </div>
  );
}
