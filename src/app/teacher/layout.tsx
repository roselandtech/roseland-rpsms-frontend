import PortalLayout from '@/components/layout/PortalLayout';

const navItems = [
  { name: 'Classroom Cockpit', href: '/teacher', icon: 'ph ph-squares-four' },
  { name: 'My Class Roster', href: '/teacher/roster', icon: 'ph ph-users-three' },
  { name: 'Daily Attendance', href: '/teacher/attendance', icon: 'ph ph-calendar-check' },
  { name: 'GES Lesson Studio', href: '/teacher/lessons', icon: 'ph ph-book-open-text' },
  { name: 'SBA & Grading', href: '/teacher/grading', icon: 'ph ph-exam' },
  { name: 'Assignments & CBT', href: '/teacher/assignments', icon: 'ph ph-notebook' },
  { name: 'Parent Messages', href: '/teacher/messages', icon: 'ph ph-chats-circle' },
  { name: 'Remedial Registry', href: '/teacher/remedial', icon: 'ph ph-trend-up' },
  { name: 'My Appraisal & CPD', href: '/teacher/appraisal', icon: 'ph ph-certificate' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout 
      portalName="Teacher Portal"
      navItems={navItems}
    >
      {children}
    </PortalLayout>
  );
}
