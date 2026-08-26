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
    description: 'Turn resumes into clear fit signals at a glance.',
    to: '/register',
  },
  {
    icon: BarChart3,
    title: 'Smart Candidate Ranking',
    description: 'Rank applicants with a shortlist teams can trust.',
    to: '/company/dashboard#candidates',
  },
  {
    icon: RefreshCcw,
    title: 'Recruitment Analytics',
    description: 'See hiring progress in one clean reporting view.',
    to: '/company/dashboard#analytics',
  },
  {
    icon: Settings2,
    title: 'Hiring Dashboard',
    description: 'Manage jobs, candidates, and interviews from one place.',
    to: '/company/dashboard',
  },
  {
    icon: UserRound,
    title: 'Candidate Dashboard',
    description: 'Let candidates track their profile and applications easily.',
    to: '/candidate/dashboard',
  },
  {
    icon: ClipboardCheck,
    title: 'Power BI Reporting',
    description: 'Export hiring data into executive-ready reports.',
    to: '/company/dashboard#analytics',
  },
];

export const steps = [
  {
    title: 'Our team creates jobs',
    description: 'Set the role and requirements in one step.',
  },
  {
    title: 'Candidate uploads resume',
    description: 'Applicants submit a simple, clean profile.',
  },
  {
    title: 'SmartHire scores the profile',
    description: 'SmartHire pulls the key signals automatically.',
  },
  {
    title: 'Recruiter hires best match',
    description: 'Move from shortlist to offer with less effort.',
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
      'It helps recruiters review candidates faster with a clear hiring workflow.',
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

export const joinBenefits = [
  {
    title: 'Career Growth',
    description: 'Mentorship, ownership, and room to grow.',
    icon: GraduationCap,
    tone: 'sky',
  },
  {
    title: 'Learning Culture',
    description: 'Modern tools and experienced teammates.',
    icon: Sparkles,
    tone: 'violet',
  },
  {
    title: 'Great Team',
    description: 'Talented people who move with care.',
    icon: Users,
    tone: 'emerald',
  },
  {
    title: 'Flexible Environment',
    description: 'Balanced schedules and a modern workplace.',
    icon: Settings2,
    tone: 'amber',
  },
  {
    title: 'Meaningful Impact',
    description: 'Build products candidates depend on.',
    icon: ClipboardCheck,
    tone: 'rose',
  },
];

export const openPositions = [
  {
    title: 'Frontend Developer',
    department: 'Engineering',
    location: 'Prishtina, Kosovo',
    type: 'Full-time',
  },
  {
    title: 'Backend Developer',
    department: 'Engineering',
    location: 'Prishtina, Kosovo',
    type: 'Full-time',
  },
  {
    title: 'Data Engineer',
    department: 'Data',
    location: 'Remote / Kosovo',
    type: 'Full-time',
  },
  {
    title: 'AI Engineer',
    department: 'AI',
    location: 'Prishtina, Kosovo',
    type: 'Full-time',
  },
  {
    title: 'UI/UX Designer',
    department: 'Product Design',
    location: 'Prishtina, Kosovo',
    type: 'Contract',
  },
];

export const hiringProcess = [
  {
    title: 'Apply',
    description: 'Share your application and resume.',
  },
  {
    title: 'Resume Review',
    description: 'We review your background and fit.',
  },
  {
    title: 'Interview',
    description: 'Meet the team and talk through the role.',
  },
  {
    title: 'Technical Assessment',
    description: 'Show your skills with a practical task.',
  },
  {
    title: 'Offer',
    description: 'We move quickly for the right match.',
  },
  {
    title: 'Welcome',
    description: 'Join SmartHire Technologies and get started.',
  },
];

export const employeeTestimonials = [
  {
    name: 'Arta Hoxha',
    role: 'Backend Developer',
    quote:
      'The team cares about clarity and craft. I get to work on real product problems with room to grow.',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Liridon Krasniqi',
    role: 'Product Designer',
    quote:
      'There is a strong sense of ownership here. We move fast, but we never lose sight of the user.',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Elira Dervishi',
    role: 'Data Engineer',
    quote:
      'I love building systems that help recruiters make better decisions for thousands of candidates.',
    image:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80',
  },
];

export const trustedTechLogos = [
  { name: 'Gjirafa', src: '/brand-logos/gjirafa.svg', className: 'h-7' },
  { name: 'TEB Kosovo', src: '/brand-logos/teb.svg', className: 'h-7' },
  { name: 'ONE FOR', src: '/brand-logos/onefor.svg', className: 'h-7' },
  { name: 'IPKO', src: '/brand-logos/ipko.png', className: 'h-8' },
  { name: 'Fourteen', src: '/brand-logos/fourteen.png', className: 'h-7' },
];
