import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Cloud,
  Code2,
  Eye,
  GraduationCap,
  Handshake,
  Lightbulb,
  Palette,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { ROUTES } from '../../constants/routes';

const departments = [
  {
    name: 'Software Engineering',
    description: 'Build the product layers that power fast, reliable, and scalable hiring experiences.',
    icon: Code2,
  },
  {
    name: 'AI & Data',
    description: 'Design intelligence pipelines that help teams make faster, better decisions.',
    icon: BrainCircuit,
  },
  {
    name: 'Cybersecurity',
    description: 'Protect customer data and keep every workflow secure by design.',
    icon: ShieldCheck,
  },
  {
    name: 'Cloud & Infrastructure',
    description: 'Create resilient systems that keep SmartHire fast, stable, and global.',
    icon: Cloud,
  },
  {
    name: 'Product & Design',
    description: 'Shape thoughtful experiences that feel simple, elegant, and intuitive.',
    icon: Palette,
  },
  {
    name: 'Business Operations',
    description: 'Support the company with talent, growth, and operational excellence.',
    icon: BriefcaseBusiness,
  },
  {
    name: 'Internship Program',
    description: 'Launch careers with hands-on learning across product, engineering, and operations.',
    icon: GraduationCap,
  },
];

const coreValues = [
  {
    title: 'Collaboration',
    description: 'We move faster when teams work with clarity, trust, and shared ownership.',
    icon: Handshake,
  },
  {
    title: 'Innovation',
    description: 'We challenge the expected and use technology to create smarter hiring.',
    icon: Sparkles,
  },
  {
    title: 'Growth',
    description: 'We invest in learning so every person can expand their skills and impact.',
    icon: Lightbulb,
  },
  {
    title: 'Excellence',
    description: 'We aim for thoughtful details, strong execution, and durable quality.',
    icon: Award,
  },
];

const galleryImages = [
  {
    src: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80',
    alt: 'Team collaborating in a modern office',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80',
    alt: 'Bright office workspace with a premium interior',
  },
  {
    src: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1400&q=80',
    alt: 'Product team reviewing ideas together',
  },
  {
    src: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=80',
    alt: 'Colleagues working together around a table',
  },
];

function DepartmentCard({ department }) {
  const Icon = department.icon;

  return (
    <article className="group rounded-[26px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 ring-1 ring-slate-200/80 transition-colors duration-300 group-hover:bg-slate-900 group-hover:text-white">
        <Icon size={22} />
      </div>
      <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.03em] text-slate-950">
        {department.name}
      </h3>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">{department.description}</p>
    </article>
  );
}

function ValueCard({ value }) {
  const Icon = value.icon;

  return (
    <article className="rounded-[24px] border border-slate-200/70 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 ring-1 ring-slate-200/70">
        <Icon size={20} />
      </div>
      <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.03em] text-slate-950">
        {value.title}
      </h3>
      <p className="mt-3 text-[15px] leading-7 text-slate-600">{value.description}</p>
    </article>
  );
}

export default function PlatformPage() {
  const location = useLocation();

  useEffect(() => {
    const targetId = location.state?.scrollTo || location.hash?.replace('#', '');

    if (!targetId) return;

    const scrollTarget = document.getElementById(targetId);

    if (scrollTarget) {
      requestAnimationFrame(() => {
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash, location.state]);

  return (
    <div className="space-y-24 pb-10 pt-4">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="order-2 lg:order-1">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            About SmartHire Technologies
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl lg:text-6xl">
            Building the future of recruitment through technology.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            SmartHire Technologies is creating a modern hiring platform that helps companies
            move faster, collaborate better, and make more confident hiring decisions with
            intelligent software.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROUTES.jobs}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              Join Our Team
              <ArrowRight size={18} />
            </Link>
            <Link
              to={ROUTES.jobs}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.04)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              View Open Positions
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-[34px] border border-slate-200/70 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
            <img
              src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80"
              alt="SmartHire Technologies office team collaborating"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Our Story
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Our Story
          </h2>
          <p className="mt-5 max-w-xl text-[17px] leading-8 text-slate-600">
            SmartHire Technologies was built to solve a familiar problem: hiring software often
            feels fragmented, slow, and disconnected from the real needs of teams. We started
            with a simple idea to bring clarity, intelligence, and confidence into every step of
            the hiring journey. Today, we design products that help companies hire with more
            precision while creating better experiences for recruiters and candidates alike.
          </p>
          <p className="mt-4 max-w-xl text-[17px] leading-8 text-slate-600">
            Our purpose is bigger than software. We are building a company where great people can
            do the best work of their careers while shaping the future of recruitment technology.
          </p>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.1)]">
          <img
            src="https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1600&q=80"
            alt="Modern office environment for SmartHire Technologies"
            className="h-[360px] w-full object-cover sm:h-[420px]"
          />
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Mission & Vision
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Mission & Vision
          </h2>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200/70 bg-white p-8 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 ring-1 ring-slate-200/70">
              <Target size={22} />
            </div>
            <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">
              Mission
            </h3>
            <p className="mt-4 text-[16px] leading-8 text-slate-600">
              Our mission is to help organizations hire smarter by combining thoughtful design,
              modern infrastructure, and AI-powered decision support in one trusted platform.
            </p>
          </article>

          <article className="rounded-[28px] border border-slate-200/70 bg-white p-8 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-900 ring-1 ring-slate-200/70">
              <Eye size={22} />
            </div>
            <h3 className="mt-6 text-[22px] font-semibold tracking-[-0.03em] text-slate-950">
              Vision
            </h3>
            <p className="mt-4 text-[16px] leading-8 text-slate-600">
              Our vision is to become the most trusted recruitment technology company for teams
              that want speed, clarity, and a genuinely better way to hire.
            </p>
          </article>
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Core Values
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Core Values
          </h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {coreValues.map((value) => (
            <ValueCard key={value.title} value={value} />
          ))}
        </div>
      </section>

      <section id="our-team">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Our Departments
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Our Departments
          </h2>
          <p className="mt-4 text-[16px] leading-8 text-slate-600">
            Every team at SmartHire Technologies contributes to the same goal: building a better
            hiring experience for modern companies and the people they employ.
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <DepartmentCard key={department.name} department={department} />
          ))}
        </div>
      </section>

      <section>
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
            Workplace Gallery
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Workplace Gallery
          </h2>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-12">
          <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:col-span-1 xl:col-span-6">
            <img
              src={galleryImages[0].src}
              alt={galleryImages[0].alt}
              className="h-full min-h-[260px] w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:col-span-1 xl:col-span-3">
            <img
              src={galleryImages[1].src}
              alt={galleryImages[1].alt}
              className="h-full min-h-[260px] w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:col-span-1 xl:col-span-3">
            <img
              src={galleryImages[2].src}
              alt={galleryImages[2].alt}
              className="h-full min-h-[260px] w-full object-cover"
            />
          </div>
          <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:col-span-2 xl:col-span-12">
            <img
              src={galleryImages[3].src}
              alt={galleryImages[3].alt}
              className="h-[300px] w-full object-cover sm:h-[340px]"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[34px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(255,255,255,1))] px-6 py-10 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:px-10 sm:py-12">
        <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500">
              Final CTA
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
              Ready to build the future with us?
            </h2>
          </div>
          <Link
            to={ROUTES.jobs}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)] transition-transform duration-300 hover:-translate-y-0.5"
          >
            Explore Careers
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
