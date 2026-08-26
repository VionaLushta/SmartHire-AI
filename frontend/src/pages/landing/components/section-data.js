import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Clock3,
  ClipboardCheck,
  RefreshCcw,
  GraduationCap,
  MessageSquareQuote,
  ScrollText,
  ShieldCheck,
  Star,
  Sparkles,
  BarChart3,
  Settings2,
  Users,
  UserRound,
} from 'lucide-react';

export const trustedCompanies = [
  'Northstar',
  'Vertex',
  'Acme',
  'Momentum',
  'Aster',
  'Forge',
  'Summit',
  'Helix',
];

export const features = [
  {
    icon: Sparkles,
    title: 'AI Resume Matching',
    description: 'Read every resume in context, then surface structured signals, highlights, and fit confidence.',
    to: '/register',
  },
  {
    icon: BarChart3,
    title: 'Smart Candidate Ranking',
    description: 'Prioritize the strongest applicants with an explainable shortlist that hiring teams can trust.',
    to: '/company/dashboard#candidates',
  },
  {
    icon: RefreshCcw,
    title: 'Recruitment Analytics',
    description: 'Track funnel movement, hiring velocity, and quality signals in one clean reporting layer.',
    to: '/company/dashboard#analytics',
  },
  {
    icon: Settings2,
    title: 'Hiring Dashboard',
    description: 'Give recruiters a command center for jobs, candidates, interviews, and team activity.',
    to: '/company/dashboard',
  },
  {
    icon: UserRound,
    title: 'Candidate Dashboard',
    description: 'Let candidates manage their profile, saved jobs, applications, and resume progress from one view.',
    to: '/candidate/dashboard',
  },
  {
    icon: ClipboardCheck,
    title: 'Power BI Reporting',
    description: 'Export the hiring story into executive-ready reporting that fits broader BI workflows.',
    to: '/company/dashboard#analytics',
  },
];

export const steps = [
  {
    title: 'Our team creates jobs',
    description: 'Define the role, requirements, and hiring priorities in a single streamlined flow.',
  },
  {
    title: 'Candidate uploads resume',
    description: 'Applicants submit clean profiles that are easy to read and ready for analysis.',
  },
  {
    title: 'SmartHire scores the profile',
    description: 'The platform extracts skills, relevance, and ranking signals automatically.',
  },
  {
    title: 'Recruiter hires best match',
    description: 'Move from shortlist to offer with confidence and a faster review cycle.',
  },
];

export const stats = [
  { label: 'Hiring Teams Using SmartHire', value: 150, suffix: '+' },
  { label: 'Candidates Screened', value: 12500, suffix: '+' },
  { label: 'Average AI Accuracy', value: 94, suffix: '%' },
];

export const comparisons = [
  {
    title: 'Traditional Hiring',
    icon: BriefcaseBusiness,
    points: [
      'Manual resume review',
      'Slow shortlisting',
      'Fragmented communication',
      'Limited visibility',
    ],
    tone: 'neutral',
  },
  {
    title: 'SmartHire AI',
    icon: ChartNoAxesCombined,
    points: [
      'Structured candidate review',
      'Fast candidate ranking',
      'Centralized workflow',
      'Clear hiring insights',
    ],
    tone: 'highlight',
  },
];

export const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Head of Talent, Horizon Labs',
    quote:
      'SmartHire AI turned hiring into a calm, data-driven process. We moved faster without losing quality.',
  },
  {
    name: 'Daniel Okafor',
    role: 'Founder, North Peak Studio',
    quote:
      'The ranking and matching experience feels polished and credible. It gives our team real confidence.',
  },
  {
    name: 'Elena Rossi',
    role: 'Recruiting Lead, Atlas Systems',
    quote:
      'We reduced review time dramatically while keeping the process elegant for candidates and recruiters.',
  },
];

export const pricing = [
  {
    name: 'Starter',
    price: '$0',
    description: 'For early teams testing the workflow.',
    features: ['Core landing experience', 'Basic job intake', 'Starter analytics'],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$39',
    description: 'For growing teams hiring every week.',
    features: ['Resume intelligence', 'Candidate ranking', 'Interview workflow'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For organizations with high-volume needs.',
    features: ['Advanced controls', 'Team reporting', 'Priority support'],
    highlighted: false,
  },
];

export const faqs = [
  {
    question: 'What does SmartHire AI do?',
    answer:
      'It helps recruiters and companies review candidates faster with a premium, structured hiring workflow.',
  },
  {
    question: 'Is any backend logic included here?',
    answer:
      'No. This ticket only creates the landing page experience and reusable UI structure.',
  },
  {
    question: 'Can this scale into a full product later?',
    answer:
      'Yes. The sections and components are split for easy expansion into future tickets.',
  },
  {
    question: 'Does it support mobile devices?',
    answer:
      'Yes. The sections, cards, and navigation are all built to remain clean and readable on smaller screens.',
  },
];

export const finalCtaIcons = {
  shield: ShieldCheck,
  clock: Clock3,
  graduation: GraduationCap,
  quotes: MessageSquareQuote,
  users: Users,
  chart: ChartNoAxesCombined,
  scroll: ScrollText,
  star: Star,
};
