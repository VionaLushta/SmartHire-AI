import {
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  NotebookPen,
  UserRound,
  Building2,
  Settings,
  LogOut,
  Sparkles,
  MessageSquareQuote,
  BookOpenCheck,
  Bookmark,
  Award,
  GraduationCap,
  Users,
  CalendarClock,
  BarChart3,
} from 'lucide-react';

export const publicNavigation = [
  { label: 'Features', to: '/#features', icon: Sparkles },
  { label: 'Pricing', to: '/#pricing', icon: BarChart3 },
  { label: 'Contact', to: '/#contact', icon: MessageSquareQuote },
  { label: 'Jobs', to: '/jobs', icon: BriefcaseBusiness },
];

export const adminNavigation = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Applications', to: '/admin/applications', icon: FileText },
  { label: 'Candidates', to: '/admin/candidates', icon: Users },
  { label: 'Jobs', to: '/admin/jobs', icon: BriefcaseBusiness },
  { label: 'Companies', to: '/admin/companies', icon: Building2 },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Reports', to: '/admin/reports', icon: BookOpenCheck },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
  { label: 'Logout', to: '/login', icon: LogOut },
];

export const dashboardNavigation = [
  { label: 'Dashboard', to: '/candidate/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', to: '/jobs', icon: BriefcaseBusiness },
  { label: 'Applications', to: '/candidate/dashboard', icon: FileText },
  { label: 'Resume', to: '/resume', icon: NotebookPen },
  { label: 'Profile', to: '/profile', icon: UserRound },
  { label: 'Company Dashboard', to: '/company/dashboard', icon: Building2 },
  { label: 'Settings', to: '/candidate/dashboard', icon: Settings },
  { label: 'Logout', to: '/login', icon: LogOut },
];

export const candidateNavigation = [
  { label: 'Dashboard', to: '#dashboard', icon: LayoutDashboard },
  { label: 'Jobs', to: '/jobs', icon: BriefcaseBusiness },
  { label: 'Applications', to: '#applications', icon: FileText },
  { label: 'Saved Jobs', to: '#saved-jobs', icon: Bookmark },
  { label: 'Resume', to: '/resume', icon: NotebookPen },
  { label: 'Certificates', to: '#certificates', icon: Award },
  { label: 'Education', to: '#education', icon: GraduationCap },
  { label: 'Trainings', to: '#trainings', icon: BookOpenCheck },
  { label: 'Profile', to: '/profile', icon: UserRound },
  { label: 'Settings', to: '#settings', icon: Settings },
  { label: 'Logout', to: '/login', icon: LogOut },
];

export const companyNavigation = [
  { label: 'Dashboard', to: '#dashboard', icon: LayoutDashboard },
  { label: 'Jobs', to: '#jobs', icon: BriefcaseBusiness },
  { label: 'Applications', to: '#applications', icon: FileText },
  { label: 'Candidates', to: '#candidates', icon: Users },
  { label: 'Interviews', to: '#interviews', icon: CalendarClock },
  { label: 'Departments', to: '#departments', icon: Building2 },
  { label: 'Trainings', to: '#trainings', icon: GraduationCap },
  { label: 'Analytics', to: '#analytics', icon: BarChart3 },
  { label: 'Company Profile', to: '#company-profile', icon: UserRound },
  { label: 'Settings', to: '#settings', icon: Settings },
  { label: 'Logout', to: '/login', icon: LogOut },
];

export const dashboardPageMeta = {
  '/candidate/dashboard': {
    title: 'Candidate Dashboard',
    breadcrumbs: ['Dashboard', 'Candidate Dashboard'],
  },
  '/company/dashboard': {
    title: 'Company Dashboard',
    breadcrumbs: ['Dashboard', 'Company Dashboard'],
  },
  '/admin/dashboard': {
    title: 'Admin Dashboard',
    breadcrumbs: ['Dashboard', 'Admin'],
  },
  '/admin/candidates': {
    title: 'Candidates',
    breadcrumbs: ['Dashboard', 'Admin', 'Candidates'],
  },
  '/admin/users': {
    title: 'Users Management',
    breadcrumbs: ['Dashboard', 'Admin', 'Users'],
  },
  '/admin/companies': {
    title: 'Companies Management',
    breadcrumbs: ['Dashboard', 'Admin', 'Companies'],
  },
  '/admin/jobs': {
    title: 'Jobs Management',
    breadcrumbs: ['Dashboard', 'Admin', 'Jobs'],
  },
  '/admin/applications': {
    title: 'Applications Management',
    breadcrumbs: ['Dashboard', 'Admin', 'Applications'],
  },
  '/admin/catalog': {
    title: 'Catalog Management',
    breadcrumbs: ['Dashboard', 'Admin', 'Catalog'],
  },
  '/admin/analytics': {
    title: 'Analytics',
    breadcrumbs: ['Dashboard', 'Admin', 'Analytics'],
  },
  '/admin/reports': {
    title: 'Reports',
    breadcrumbs: ['Dashboard', 'Admin', 'Reports'],
  },
  '/admin/settings': {
    title: 'System Settings',
    breadcrumbs: ['Dashboard', 'Admin', 'Settings'],
  },
  '/profile': {
    title: 'Profile',
    breadcrumbs: ['Dashboard', 'Profile'],
  },
  '/resume': {
    title: 'Resume',
    breadcrumbs: ['Dashboard', 'Resume'],
  },
};
