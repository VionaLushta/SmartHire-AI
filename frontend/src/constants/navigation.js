import {
  Home,
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
import { ROUTES } from './routes';

export const publicNavigation = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Jobs', to: ROUTES.jobs, icon: BriefcaseBusiness },
  { label: 'About Us', to: ROUTES.about, icon: Users },
  { label: 'Contact', to: ROUTES.contact, icon: MessageSquareQuote },
];

export const adminNavigation = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Applications', to: '/admin/applications', icon: FileText },
  { label: 'Candidates', to: '/admin/candidates', icon: Users },
  { label: 'Jobs', to: '/admin/jobs', icon: BriefcaseBusiness },
  { label: 'Departments', to: '/admin/companies', icon: Building2 },
  { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
  { label: 'Reports', to: '/admin/reports', icon: BookOpenCheck },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
  { label: 'Logout', to: '/candidate/login', icon: LogOut },
];

export const dashboardNavigation = [
  { label: 'Dashboard', to: '/candidate/dashboard', icon: LayoutDashboard },
  { label: 'Jobs', to: '/jobs', icon: BriefcaseBusiness },
  { label: 'Applications', to: '/candidate/dashboard', icon: FileText },
  { label: 'Resume', to: '/resume', icon: NotebookPen },
  { label: 'Profile', to: '/profile', icon: UserRound },
  { label: 'Hiring Dashboard', to: '/company/dashboard', icon: Building2 },
  { label: 'Settings', to: '/candidate/dashboard', icon: Settings },
  { label: 'Logout', to: '/candidate/login', icon: LogOut },
];

export const candidateNavigation = [
  { label: 'Dashboard', to: '/candidate/dashboard', icon: LayoutDashboard },
  { label: 'My Profile', to: '/profile', icon: UserRound },
  { label: 'My Resume', to: '/resume', icon: NotebookPen },
  { label: 'Certificates', to: '/certificates', icon: Award },
  { label: 'Applications', to: '/applied-jobs', icon: FileText },
  { label: 'Saved Jobs', to: '/saved-jobs', icon: Bookmark },
  { label: 'Notifications', to: '/notifications', icon: Sparkles },
  { label: 'Account Settings', to: '/candidate/settings', icon: Settings },
  { label: 'Logout', to: '/candidate/login', icon: LogOut },
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
  { label: 'Our Company', to: '#company-profile', icon: UserRound },
  { label: 'Settings', to: '#settings', icon: Settings },
  { label: 'Logout', to: '/candidate/login', icon: LogOut },
];

export const dashboardPageMeta = {
  '/candidate/dashboard': {
    title: 'Candidate Dashboard',
    breadcrumbs: ['Dashboard', 'Candidate Dashboard'],
  },
  '/company/dashboard': {
    title: 'Hiring Dashboard',
    breadcrumbs: ['Dashboard', 'Hiring Dashboard'],
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
    title: 'Departments Management',
    breadcrumbs: ['Dashboard', 'Admin', 'Departments'],
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
