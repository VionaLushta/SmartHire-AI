import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { BrainCircuit, BriefcaseBusiness, Download, Sparkles } from 'lucide-react';
import ResumeUploader from '../../components/resume/ResumeUploader';
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
import { resumeService } from '../../services/resumeService';
import { unwrapItems, unwrapResponse, clampPercent } from '../../utils/dashboard';

const defaultRecommendation = {
  overall_score: 84,
  summary: 'Your resume is strong and aligned for mid-level product and operations roles, but a few role-specific improvements can elevate it further.',
  strengths: ['Strong project leadership and execution', 'Clear communication and collaboration signal', 'Good alignment with operations and product contexts'],
  weaknesses: ['Limited explicit keyword coverage', 'Weak certification signal', 'Experience bullets can be more measurable'],
  missing_skills: ['Data storytelling', 'Executive communication', 'Advanced analytics'],
  recommendations: [
    { priority: 'High', title: 'Align to job keywords', learning_type: 'Optimization', reason: 'Add explicit keywords from the target role to improve ATS compatibility and recruiter scanning.', estimated_score_gain: 9, estimated_time_months: 2 },
    { priority: 'Medium', title: 'Strengthen measurable outcomes', learning_type: 'Communication', reason: 'Use achievement-led bullet points with business impact metrics to improve clarity.', estimated_score_gain: 6, estimated_time_months: 1 },
  ],
  career_insights: {
    career_readiness_level: 'Mid-Level',
    hiring_probability: 'High',
    explanation: 'Your profile is competitive for mid-level roles with a few focused enhancements.',
  },
};

export default function ResumePage() {
  const { user } = useSelector((state) => state.auth);
  const [resumeItems, setResumeItems] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('Ready');
  const [analysis, setAnalysis] = useState(defaultRecommendation);
  const [error, setError] = useState(null);

  const previewUrl = useMemo(() => {
    if (!selectedResume?.file_path) return '';
    return `https://example.com/${selectedResume.file_path.split(/[\\/]/).pop()}`;
  }, [selectedResume]);

  useEffect(() => {
    async function loadResumes() {
      try {
        setLoading(true);
        const response = await resumeService.list();
        const items = unwrapItems(response);
        setResumeItems(items);
        setSelectedResume(items[0] || null);
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
    setUploadStatus('Uploading');
    setUploadProgress(15);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await resumeService.upload(formData);
      const nextResume = unwrapResponse(response);
      const refreshed = await resumeService.list();
      const items = unwrapItems(refreshed);
      setResumeItems(items);
      setSelectedResume(nextResume || items[0] || null);
      setUploadStatus('Upload complete');
      setUploadProgress(100);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Upload failed.');
      setUploadStatus('Upload failed');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1200);
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

  const matchedSkills = ['Product strategy', 'Stakeholder communication', 'SQL', 'Agile delivery', 'Leadership'];
  const missingSkills = ['Advanced analytics', 'Executive storytelling', 'Go-to-market strategy'];

  if (loading) {
    return <LoadingState title="Loading resume workspace..." />;
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate profile</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Resume & AI analysis</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button as={Link} to="/profile" variant="secondary">Update profile</Button>
            <Button as={Link} to="/jobs" variant="primary">Explore roles</Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <ResumeUploader
            onUpload={handleUpload}
            isUploading={uploading}
            progress={uploadProgress}
            status={uploadStatus}
            existingResume={selectedResume}
            onReplace={() => {
              const input = document.querySelector('input[type="file"]');
              input?.click?.();
            }}
            onDelete={() => selectedResume && handleDelete(selectedResume.resume_id)}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ResumeScore score={clampPercent(analysis.overall_score)} summary={analysis.summary} />

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
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AI analysis</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Skills and recommendations</h2>
              </div>
              <BrainCircuit className="h-6 w-6 text-slate-700" aria-hidden="true" />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <InsightCard title="Skills found" value={matchedSkills.length} description="mapped to your current profile" />
              <InsightCard title="Missing skills" value={missingSkills.length} description="priority for target roles" />
              <InsightCard title="Education summary" value="BSc / Computer Science" description="Strong academic base" />
              <InsightCard title="Experience summary" value="7 years" description="Product & operations" />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-950">Matched skills</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {matchedSkills.map((skill) => (
                  <SkillBadge key={skill} tone="success">{skill}</SkillBadge>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">Missing skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingSkills.map((skill) => (
                    <SkillBadge key={skill} tone="warning">{skill}</SkillBadge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-950">Recommended certifications</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <SkillBadge tone="primary">Product Analytics</SkillBadge>
                  <SkillBadge tone="primary">Leadership Essentials</SkillBadge>
                  <SkillBadge tone="primary">Data Storytelling</SkillBadge>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {selectedResume ? (
            <ResumePreview resume={selectedResume} previewUrl={previewUrl} onReplace={() => {}} onDownload={() => {}} />
          ) : (
            <EmptyState title="No resume uploaded" description="Upload a resume to generate AI analysis and a preview." />
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">AI suggestions</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Actionable guidance</h3>
            <div className="mt-5 space-y-3">
              {(analysis.recommendations || []).map((item, index) => (
                <SuggestionCard
                  key={`${item.title}-${index}`}
                  title={item.title}
                  detail={`${item.reason} Estimated gain: +${item.estimated_score_gain}% in ${item.estimated_time_months} month${item.estimated_time_months > 1 ? 's' : ''}.`}
                  tone={index === 0 ? 'primary' : 'warning'}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Career advice</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Recommended next moves</h3>
            <div className="mt-5 space-y-3">
              <SuggestionCard title="Target role fit" detail={analysis.career_insights?.explanation || 'Your profile is well aligned to mid-level functional roles.'} tone="success" />
              <SuggestionCard title="Hiring probability" detail={`${analysis.career_insights?.hiring_probability || 'High'} likelihood for relevant mid-level openings.`} tone="primary" />
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

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}
    </div>
  );
}
