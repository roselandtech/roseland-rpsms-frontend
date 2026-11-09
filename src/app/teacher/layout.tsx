import PortalLayout from '@/components/layout/PortalLayout';
import { cookies } from 'next/headers';

const baseNavItems = [
  { name: 'Classroom Cockpit', href: '/teacher', icon: 'ph ph-squares-four' },
  { name: 'My Class Roster', href: '/teacher/roster', icon: 'ph ph-users-three' },
  { name: 'Daily Attendance', href: '/teacher/attendance', icon: 'ph ph-calendar-check' },
  { name: 'GES Lesson Studio', href: '/teacher/lessons', icon: 'ph ph-book-open-text' },
  { name: 'Dynamic CA Tracker', href: '/teacher/ca-tracker', icon: 'ph ph-chart-bar' },
  { name: 'SBA Gradebook', href: '/teacher/grading', icon: 'ph ph-exam' },
  { name: 'Assignments & CBT', href: '/teacher/assignments', icon: 'ph ph-notebook' },
  { name: 'Parent Messages', href: '/teacher/messages', icon: 'ph ph-chats-circle' },
  { name: 'Remedial Registry', href: '/teacher/remedial', icon: 'ph ph-trend-up' },
  { name: 'My Appraisal & CPD', href: '/teacher/appraisal', icon: 'ph ph-certificate' },
];

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const role = cookieStore.get('roseland_role')?.value;
  const navItems = [...baseNavItems];

  if (role === 'HEADMASTER' || role === 'SUPER_ADMIN') {
    navItems.unshift({ name: '← Headmaster Cockpit', href: '/headmaster', icon: 'ph ph-gauge' });
  } else if (role === 'ADMIN') {
    navItems.unshift({ name: '← System Admin (RBAC)', href: '/admin/permissions', icon: 'ph ph-shield-check' });
  }

  return (
    <PortalLayout 
      portalName="Teacher Portal"
      navItems={navItems}
    >
      {children}
    </PortalLayout>
  );
}
