import { ArrowRight, BrainCircuit, Building2, CheckCircle2, Code2, Eye, Handshake, Mail, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const storyPoints = [
  'SmartHire AI was built to replace slow, fragmented hiring workflows with one connected experience.',
  'We combine job publishing, candidate applications, AI screening, and dashboard analytics in a single platform.',
  'Our team focuses on practical recruiting tools that help organizations hire faster without losing quality.',
];

const aiSteps = [
  {
    title: 'Candidate applies',
    description: 'A candidate opens a job, uploads a resume, and submits the application from a dedicated Apply page.',
  },
  {
    title: 'System extracts signals',
    description: 'SmartHire AI reads the resume, job requirements, and candidate profile to identify relevant skills and gaps.',
  },
  {
    title: 'AI evaluates fit',
    description: 'The platform generates a match score, missing skills, strengths, and a recommendation for the hiring team.',
  },
  {
    title: 'Admin sees the result',
    description: 'Applications appear immediately in dashboards, candidate management, and application review screens.',
  },
];

const whyChoose = [
  {
    title: 'Real persistence',
    description: 'Every application, resume, certificate, and analysis is stored in the backend and survives refresh.',
  },
  {
    title: 'AI-assisted screening',
    description: 'Recruiters get a structured match view instead of manually reading every application from scratch.',
  },
  {
    title: 'End-to-end flow',
    description: 'Job discovery, detail pages, apply flow, and admin review all stay connected in one system.',
  },
  {
    title: 'Designed for teams',
    description: 'Candidates, hiring managers, recruiters, and admins each get the views they need to move faster.',
  },
];

const technologies = [
  { name: 'React', icon: Code2 },
  { name: 'FastAPI', icon: Building2 },
  { name: 'PostgreSQL', icon: ShieldCheck },
  { name: 'AI matching', icon: BrainCircuit },
  { name: 'NLP and OCR', icon: Sparkles },
  { name: 'Role-based access', icon: Target },
];

const team = [
  {
    title: 'Product & Design',
    description: 'Shapes the candidate and recruiter experience so the platform stays intuitive and consistent.',
  },
  {
    title: 'Engineering',
    description: 'Builds the frontend, backend, automation, and data flows that power the hiring workflow.',
  },
  {
    title: 'AI & Data',
    description: 'Maintains the matching logic, scoring pipeline, and analytics that surface meaningful signals.',
  },
  {
    title: 'Operations',
    description: 'Keeps support, partnerships, and platform reliability aligned with customer needs.',
  },
];

const partners = [
  { name: 'TEB', src: '/brand-logos/teb.svg' },
  { name: 'OneFor', src: '/brand-logos/onefor.svg' },
  { name: 'IPKO', src: '/brand-logos/ipko.png' },
  { name: 'Gjirafa', src: '/brand-logos/gjirafa.svg' },
  { name: 'Fourteen', src: '/brand-logos/fourteen.png' },
  { name: 'Tectigon', src: '/brand-logos/tectigon-apple-icon.png' },
];

const contacts = [
  { label: 'Office', value: 'Prishtina, Kosovo' },
  { label: 'Email', value: 'smarthireaii@proton.me' },
  { label: 'Careers', value: 'careers@smarthire.ai' },
  { label: 'Phone', value: '+383 49 123 456' },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
        {title}
      </h2>
      {description ? <p className="mt-4 text-[16px] leading-8 text-slate-600">{description}</p> : null}
    </div>
  );
}

function IconCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700 ring-1 ring-slate-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">{item.description}</p>
    </article>
  );
}

export default function AboutUsPage() {
  return (
    <div className="space-y-24 pb-12 pt-4">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            About Us
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
            SmartHire AI helps teams hire with clarity, speed, and confidence.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            We built SmartHire AI to connect the entire hiring journey from job discovery to AI-assisted evaluation in one platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to={ROUTES.contact}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              Contact Us
              <ArrowRight size={18} />
            </Link>
            <Link
              to={ROUTES.jobs}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              View Jobs
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
          <img
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80"
            alt="SmartHire AI team collaborating"
            className="h-[360px] w-full object-cover sm:h-[420px]"
          />
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Company Story"
          title="Company Story"
          description="SmartHire AI began with a simple idea: hiring should feel structured, fast, and intelligent for both candidates and recruiters."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
              <Users className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="mt-6 space-y-4 text-[16px] leading-8 text-slate-600">
              {storyPoints.map((point) => (
                <p key={point}>{point}</p>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <img
              src="https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1600&q=80"
              alt="Modern SmartHire AI workspace"
              className="h-full min-h-[320px] w-full object-cover"
            />
          </article>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Mission Vision" title="Mission and Vision" />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
              <Target className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">Mission</h3>
            <p className="mt-4 text-[16px] leading-8 text-slate-600">
              Our mission is to help organizations hire smarter by combining thoughtful UX, reliable backend persistence, and AI-assisted evaluation in one platform.
            </p>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
              <Eye className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">Vision</h3>
            <p className="mt-4 text-[16px] leading-8 text-slate-600">
              Our vision is to become the most trusted AI recruiting platform for teams that want a clean, measurable, and people-centered hiring process.
            </p>
          </article>
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="How It Works"
          title="How SmartHire AI works"
          description="The platform is designed so every stage of the hiring journey is connected, traceable, and available to the right people."
        />

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {aiSteps.map((step, index) => (
            <article key={step.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Step {index + 1}
              </p>
              <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">
                {step.title}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Why Choose"
          title="Why choose SmartHire AI"
          description="We focus on the practical parts of hiring software that teams use every day."
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {whyChoose.map((item) => (
            <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">
                {item.title}
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Technologies" title="Technologies" />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {technologies.map((item) => (
            <IconCard key={item.title || item.name} item={{ title: item.name, description: 'Used across the hiring platform to keep the experience fast, secure, and intelligent.', icon: item.icon }} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Team"
          title="Team"
          description="SmartHire AI is built by a cross-functional team that cares about product quality, reliability, and candidate experience."
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {team.map((item) => (
            <article key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                <Handshake className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="Partners" title="Partners" />

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {partners.map((partner) => (
            <article key={partner.name} className="flex flex-col items-center justify-center rounded-[22px] border border-slate-200 bg-white px-4 py-6 text-center shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <img src={partner.src} alt={partner.name} className="h-12 w-auto object-contain" loading="lazy" />
              <p className="mt-4 text-sm font-medium text-slate-700">{partner.name}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          eyebrow="Contact Information"
          title="Contact information"
          description="Reach out for company inquiries, partnerships, or general product questions."
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {contacts.map((item) => (
            <article key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                <Mail className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">{item.label}</h3>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(255,255,255,1))] px-6 py-10 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:px-10 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Stay in touch
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Want to learn more about SmartHire AI?
            </h2>
          </div>

          <Link
            to={ROUTES.contact}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            Contact Us
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
