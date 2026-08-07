import PortalLayout from '@/components/layout/PortalLayout';
import { executiveNavGroups, EXECUTIVE_PORTAL_NAME } from '@/lib/executiveNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalLayout 
      portalName={EXECUTIVE_PORTAL_NAME}
      navGroups={executiveNavGroups}
    >
      {children}
    </PortalLayout>
  );
}
