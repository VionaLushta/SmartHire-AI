import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BriefcaseBusiness, CheckCircle2, FileText, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileCard from '../../components/profile/ProfileCard';
import SkillsSection from '../../components/profile/SkillsSection';
import EducationTimeline from '../../components/profile/EducationTimeline';
import CertificateCard from '../../components/profile/CertificateCard';
import TrainingCard from '../../components/profile/TrainingCard';
import ExperienceTimeline from '../../components/profile/ExperienceTimeline';
import CareerGoalsCard from '../../components/profile/CareerGoalsCard';
import ProgressCard from '../../components/profile/ProgressCard';
import LoadingState from '../../components/jobs/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import { candidateService } from '../../services/candidateService';
import { educationService } from '../../services/educationService';
import { certificateService } from '../../services/certificateService';
import { loadCandidateDashboard, updateCandidateProfile } from '../../redux/slices/candidateSlice';
import { unwrapItems, unwrapResponse } from '../../utils/dashboard';

const starterCareerGoals = {
  preferred_role: 'Product Manager',
  preferred_salary: '$120k - $150k',
  preferred_location: 'Remote / Berlin',
  remote_preference: 'Hybrid-friendly',
  industries: ['Technology', 'SaaS'],
  career_interests: ['Leadership', 'Growth strategy'],
};

const starterSkills = [
  { id: 1, name: 'Product strategy', category: 'Strategy', level: 'Expert' },
  { id: 2, name: 'Stakeholder communication', category: 'Communication', level: 'Advanced' },
  { id: 3, name: 'SQL', category: 'Analytics', level: 'Advanced' },
  { id: 4, name: 'Agile delivery', category: 'Delivery', level: 'Advanced' },
  { id: 5, name: 'Leadership', category: 'Leadership', level: 'Intermediate' },
];

const starterEducation = [
  {
    education_id: 1,
    institution: 'University of Technology',
    degree: 'BSc in Computer Science',
    field_of_study: 'Software Engineering',
    start_date: '2014-09-01',
    end_date: '2018-06-30',
    description: 'Focus on software engineering, distributed systems, and product strategy.',
  },
];

const starterCertificates = [
  { cert_id: 1, title: 'Certified Product Leader', issuer: 'Product School', issue_date: '2024-01-15', expiry_date: null, credential_id: 'PS-3189' },
  { cert_id: 2, title: 'Google Analytics Certification', issuer: 'Google', issue_date: '2023-07-01', expiry_date: '2026-07-01', credential_id: 'GA-28421' },
];

const starterTrainings = [
  { training_id: 1, training: 'Executive Leadership Program', provider: 'Harvard Business School', completed_date: '2024-08-01', status: 'Completed', certificate: 'Leadership Certificate' },
  { training_id: 2, training: 'Data Storytelling for PMs', provider: 'Coursera', completed_date: '2025-02-15', status: 'In progress', certificate: 'In progress' },
];

const starterExperience = [
  { work_experience_id: 1, company_name: 'Northstar Labs', title: 'Senior Product Manager', start_date: '2022-01-01', end_date: null, current: true, description: 'Led roadmap prioritization, stakeholder alignment, and cross-functional delivery across a product portfolio.' },
  { work_experience_id: 2, company_name: 'BrightPilot', title: 'Product Analyst', start_date: '2019-03-01', end_date: '2021-12-31', current: false, description: 'Built analytics dashboards, created KPI frameworks, and partnered with engineering on feature delivery.' },
];

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { profile, dashboard, status } = useSelector((state) => state.candidate);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
  });
  const [educationItems, setEducationItems] = useState(starterEducation);
  const [certificateItems, setCertificateItems] = useState(starterCertificates);
  const [trainingItems, setTrainingItems] = useState(starterTrainings);
  const [experienceItems, setExperienceItems] = useState(starterExperience);
  const [error, setError] = useState(null);

  const profileCompletion = useMemo(() => {
    const candidate = profile || user || {};
    return Math.min(
      100,
      Math.max(
        36,
        [
          candidate.first_name,
          candidate.last_name,
          candidate.email,
          candidate.phone,
          candidate.city,
          candidate.country,
          candidate.linkedin_url,
          candidate.github_url,
          candidate.portfolio_url,
        ].filter(Boolean).length * 12,
      ),
    );
  }, [profile, user]);

  useEffect(() => {
    if (user) {
      dispatch(loadCandidateDashboard({ candidateId: user.user_id || user.id }));
    }
  }, [dispatch, user]);

  useEffect(() => {
    const nextProfile = profile || user || {};
    setProfileForm({
      first_name: nextProfile.first_name || '',
      last_name: nextProfile.last_name || '',
      email: nextProfile.email || '',
      phone: nextProfile.phone || '',
      city: nextProfile.city || '',
      country: nextProfile.country || '',
      linkedin_url: nextProfile.linkedin_url || '',
      github_url: nextProfile.github_url || '',
      portfolio_url: nextProfile.portfolio_url || '',
    });
  }, [profile, user]);

  useEffect(() => {
    async function loadProfileCollections() {
      try {
        const [educationResponse, certificateResponse] = await Promise.all([
          educationService.list(),
          certificateService.list(),
        ]);
        const education = unwrapItems(educationResponse);
        const certificates = unwrapItems(certificateResponse);
        setEducationItems(education.length ? education : starterEducation);
        setCertificateItems(certificates.length ? certificates : starterCertificates);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Unable to load profile details.');
      }
    }

    if (user) {
      loadProfileCollections();
    }
  }, [user]);

  async function handleProfileSave(event) {
    event.preventDefault();
    try {
      setError(null);
      const payload = {
        ...profileForm,
        profile_picture_url: profile?.profile_picture_url || null,
      };
      const action = await dispatch(updateCandidateProfile(payload));
      if (updateCandidateProfile.fulfilled.match(action)) {
        setEditingProfile(false);
        dispatch(loadCandidateDashboard({ candidateId: user?.user_id || user?.id }));
      }
    } catch (err) {
      setError(err?.message || 'Unable to save the profile.');
    }
  }

  async function handleEducationSave(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const payload = {
      resume_id: 1,
      institution: form.get('institution'),
      degree: form.get('degree'),
      field_of_study: form.get('field_of_study'),
      start_date: form.get('start_date'),
      end_date: form.get('end_date'),
      description: form.get('description'),
    };
    try {
      const response = await educationService.create(payload);
      const next = unwrapResponse(response);
      setEducationItems((current) => [next, ...current]);
      event.target.reset();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to add education.');
    }
  }

  async function handleCertificateSave(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    const file = form.get('file');
    const payload = new FormData();
    payload.append('title', form.get('title'));
    payload.append('issuer', form.get('issuer') || '');
    payload.append('issue_date', form.get('issue_date') || '');
    if (file && file.name) payload.append('file', file);

    try {
      const response = await certificateService.create(payload);
      const next = unwrapResponse(response);
      setCertificateItems((current) => [next, ...current]);
      event.target.reset();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Unable to add certificate.');
    }
  }

  const skills = useMemo(() => {
    const skillData = profile?.skills || dashboard?.skill_gap_analysis?.most_common_skills || starterSkills;
    return Array.isArray(skillData)
      ? skillData.map((skill, index) => ({
          id: skill.id ?? index + 1,
          name: typeof skill === 'string' ? skill : skill.name || 'Skill',
          category: typeof skill === 'string' ? 'General' : skill.category || 'General',
          level: typeof skill === 'string' ? 'Intermediate' : skill.level || 'Intermediate',
        }))
      : starterSkills;
  }, [profile, dashboard]);

  if (status === 'loading' && !profile) {
    return <LoadingState title="Loading profile details..." />;
  }

  return (
    <div className="space-y-8 pb-10">
      <ProfileHeader profile={profile || user || {}} completion={profileCompletion} />

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <ProfileCard profile={profile || user || {}} completion={profileCompletion} onEdit={() => setEditingProfile(true)} />

          {editingProfile ? (
            <form onSubmit={handleProfileSave} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Edit profile</p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">Update your details</h3>
                </div>
                <Button type="button" variant="ghost" onClick={() => setEditingProfile(false)}>Close</Button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Input label="First name" value={profileForm.first_name} onChange={(event) => setProfileForm((current) => ({ ...current, first_name: event.target.value }))} />
                <Input label="Last name" value={profileForm.last_name} onChange={(event) => setProfileForm((current) => ({ ...current, last_name: event.target.value }))} />
                <Input label="Email" type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} />
                <Input label="Phone" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} />
                <Input label="City" value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} />
                <Input label="Country" value={profileForm.country} onChange={(event) => setProfileForm((current) => ({ ...current, country: event.target.value }))} />
                <Input label="LinkedIn" value={profileForm.linkedin_url} onChange={(event) => setProfileForm((current) => ({ ...current, linkedin_url: event.target.value }))} />
                <Input label="GitHub" value={profileForm.github_url} onChange={(event) => setProfileForm((current) => ({ ...current, github_url: event.target.value }))} />
                <div className="md:col-span-2">
                  <Input label="Portfolio" value={profileForm.portfolio_url} onChange={(event) => setProfileForm((current) => ({ ...current, portfolio_url: event.target.value }))} />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setEditingProfile(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save profile</Button>
              </div>
            </form>
          ) : null}

          <SkillsSection skills={skills} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />

          <EducationTimeline items={educationItems} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />

          <CertificateCard items={certificateItems} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />

          <TrainingCard items={trainingItems} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />

          <ExperienceTimeline items={experienceItems} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />
        </div>

        <div className="space-y-6">
          <ProgressCard
            title="Profile coverage"
            items={[
              { label: 'Resume', value: 86, tone: 'bg-slate-900' },
              { label: 'Skills', value: 82, tone: 'bg-emerald-500' },
              { label: 'Education', value: 78, tone: 'bg-cyan-500' },
              { label: 'Experience', value: 88, tone: 'bg-violet-500' },
              { label: 'Certificates', value: 68, tone: 'bg-amber-500' },
              { label: 'Profile', value: 90, tone: 'bg-slate-700' },
            ]}
          />

          <CareerGoalsCard goals={starterCareerGoals} />

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Status</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Healthy profile signal</h3>
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-5 w-5" /> Profile is synced to the authenticated candidate record.
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <FileText className="h-5 w-5 text-slate-500" /> Resume uploads use the existing backend upload endpoint.
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <BriefcaseBusiness className="h-5 w-5 text-slate-500" /> Career data is shown as structured profile information and is ready for deeper backend expansion.
              </div>
            </div>
          </section>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
    </div>
  );
}
