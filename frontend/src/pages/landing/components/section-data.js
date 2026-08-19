import {
  ArrowPathRoundedSquareIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  BrainCircuit,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Clock3,
  GraduationCap,
  MessageSquareQuote,
  ScrollText,
  ShieldCheck,
  Star,
  Users,
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
    icon: SparklesIcon,
    title: 'AI Resume Analysis',
    description: 'Understand every profile instantly with structured signals, highlights, and fit scoring.',
  },
  {
    icon: ChartBarIcon,
    title: 'Candidate Ranking',
    description: 'Prioritize the best applicants with a clean, explainable shortlist.',
  },
  {
    icon: ArrowPathRoundedSquareIcon,
    title: 'Skill Matching',
    description: 'Match job requirements to experience, certifications, and hidden strengths.',
  },
  {
    icon: Cog6ToothIcon,
    title: 'Smart Recommendations',
    description: 'Surface next-best actions for recruiters and hiring managers across the funnel.',
  },
  {
    icon: UserGroupIcon,
    title: 'Analytics Dashboard',
    description: 'Track hiring velocity, candidate quality, and team performance in one place.',
  },
  {
    icon: ClipboardDocumentCheckIcon,
    title: 'Interview Management',
    description: 'Coordinate interviews and decision steps with an efficient, shared workflow.',
  },
];

export const steps = [
  {
    title: 'Company creates job',
    description: 'Define the role, requirements, and hiring priorities in a single streamlined flow.',
  },
  {
    title: 'Candidate uploads resume',
    description: 'Applicants submit clean profiles that are easy to read and ready for analysis.',
  },
  {
    title: 'AI analyzes profile',
    description: 'SmartHire AI extracts skills, relevance, and ranking signals automatically.',
  },
  {
    title: 'Recruiter hires best match',
    description: 'Move from shortlist to offer with confidence and a faster review cycle.',
  },
];

export const stats = [
  { label: 'Jobs', value: 1200, suffix: '+' },
  { label: 'Candidates', value: 48000, suffix: '+' },
  { label: 'Companies', value: 980, suffix: '+' },
  { label: 'Success Rate', value: 94, suffix: '%' },
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
    icon: BrainCircuit,
    points: [
      'AI-assisted review',
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
    features: ['AI resume analysis', 'Candidate ranking', 'Interview workflow'],
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
      'It helps recruiters and companies review candidates faster with a premium, AI-first hiring workflow.',
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
