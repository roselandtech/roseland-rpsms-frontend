import { NavGroup } from '@/components/layout/Sidebar';

export const EXECUTIVE_PORTAL_NAME = "Executive Command";

export const executiveNavGroups: NavGroup[] = [
  {
    title: "Executive & Academics",
    items: [
      { name: 'Executive Cockpit', href: '/headmaster', icon: 'ph ph-gauge' },
      { name: 'Timetable & Class Streams', href: '/admin/academics', icon: 'ph ph-chalkboard-teacher' },
      { name: 'Curriculum & Subjects', href: '/admin/academics/curriculum', icon: 'ph ph-book-open' },
      { name: 'Academic Calendar', href: '/admin/academics/calendar', icon: 'ph ph-calendar' },
      { name: 'Lesson Plans & Inspections', href: '/headmaster/inspections', icon: 'ph ph-clipboard-text' },
      { name: 'Report Card Sign-Offs', href: '/headmaster/approvals', icon: 'ph ph-seal-check' },
      { name: 'BECE Mock Analytics', href: '/headmaster/bece-analytics', icon: 'ph ph-chart-line-up' },
    ]
  },
  {
    title: "Admissions & Students (SIS)",
    items: [
      { name: 'Admissions & Pipeline', href: '/admin/admissions', icon: 'ph ph-user-plus' },
      { name: 'Students & Parents (SIS)', href: '/admin/students', icon: 'ph ph-student' },
      { name: 'At-Risk Scholar Registry', href: '/headmaster/at-risk', icon: 'ph ph-warning-circle' },
      { name: 'Pastoral Care & Discipline', href: '/headmaster/discipline', icon: 'ph ph-shield-star' },
    ]
  },
  {
    title: "Finance & Bursary",
    items: [
      { name: 'Fee Ledger & Billing', href: '/admin/finance', icon: 'ph ph-wallet' },
    ]
  },
  {
    title: "Faculty & Staff (HR)",
    items: [
      { name: 'Faculty Directory & Allocations', href: '/admin/staff', icon: 'ph ph-users-three' },
      { name: 'Teacher Quality & Appraisals', href: '/headmaster/appraisals', icon: 'ph ph-certificate' },
    ]
  },
  {
    title: "Logistics & Communications",
    items: [
      { name: 'Broadcasts & SMS Hub', href: '/admin/communications', icon: 'ph ph-broadcast' },
      { name: 'CBT Examination Center', href: '/admin/cbt', icon: 'ph ph-laptop' },
      { name: 'Institutional Settings & Audit', href: '/admin/settings', icon: 'ph ph-gear' },
    ]
  }
];
