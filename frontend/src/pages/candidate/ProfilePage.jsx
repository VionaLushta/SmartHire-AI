import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BriefcaseBusiness, CheckCircle2, FileText } from 'lucide-react';
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
import ErrorState from '../../components/ui/ErrorState';
import { educationService } from '../../services/educationService';
import { certificateService } from '../../services/certificateService';
import { loadCandidateDashboard, updateCandidateProfile } from '../../redux/slices/candidateSlice';
import { unwrapItems } from '../../utils/dashboard';

const emptyCollection = [];

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
    about_me: '',
  });
  const [educationItems, setEducationItems] = useState(emptyCollection);
  const [certificateItems, setCertificateItems] = useState(emptyCollection);
  const [trainingItems] = useState(emptyCollection);
  const [experienceItems] = useState(emptyCollection);
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
      about_me: nextProfile.about_me || '',
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
        setEducationItems(education);
        setCertificateItems(certificates);
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

  const skills = useMemo(() => {
    const skillData = profile?.skills || dashboard?.skill_gap_analysis?.most_common_skills || [];
    return Array.isArray(skillData)
      ? skillData.map((skill, index) => ({
          id: skill.id ?? index + 1,
          name: typeof skill === 'string' ? skill : skill.name || 'Skill',
          category: typeof skill === 'string' ? 'General' : skill.category || 'General',
          level: typeof skill === 'string' ? 'Intermediate' : skill.level || 'Intermediate',
        }))
      : [];
  }, [profile, dashboard]);

  if (status === 'loading' && !profile) {
    return <LoadingState title="Loading profile details..." description="Retrieving profile, education, and certificate information." />;
  }

  if (error && !profile && !dashboard) {
    return (
      <ErrorState
        title="Unable to load the profile workspace"
        description={error}
        onRetry={() => dispatch(loadCandidateDashboard({ candidateId: user?.user_id || user?.id }))}
      />
    );
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
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="about-me">About me</label>
                  <textarea id="about-me" value={profileForm.about_me} onChange={(event) => setProfileForm((current) => ({ ...current, about_me: event.target.value }))} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
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

          <CareerGoalsCard goals={profile?.career_goals || {}} />

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

      {error ? (
        <ErrorState
          title="Some profile sections could not be refreshed"
          description={error}
        />
      ) : null}
    </div>
  );
}
