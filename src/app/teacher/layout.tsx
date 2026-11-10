import PortalLayout from '@/components/layout/PortalLayout';
import { executiveNavGroups } from '@/lib/executiveNav';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout 
      portalName="Teacher Portal"
      navGroups={executiveNavGroups}
    >
      {children}
    </PortalLayout>
  );
}
