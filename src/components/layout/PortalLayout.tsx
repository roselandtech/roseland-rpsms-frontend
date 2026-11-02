"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar, { NavItem, NavGroup } from './Sidebar';
import TopHeader from './TopHeader';
import CommandPalette from './CommandPalette';
import { AuthService, RoselandUser } from '@/lib/auth';

interface PortalLayoutProps {
  children: React.ReactNode;
  portalName: string;
  userName?: string;
  userRole?: string;
  userAvatar?: string;
  navItems?: NavItem[];
  navGroups?: NavGroup[];
  headerContent?: React.ReactNode;
}

export default function PortalLayout({ 
  children, 
  portalName, 
  userName, 
  userRole, 
  userAvatar, 
  navItems,
  navGroups,
  headerContent
}: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [isBackendWaking, setIsBackendWaking] = useState(false);
  const [workspaceRefreshKey, setWorkspaceRefreshKey] = useState(0);

  // Listen for Free-Tier Backend Cold-Start Wake-Up & Idle Session Resume
  useEffect(() => {
    const onBackendWaking = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail) return;
      setIsBackendWaking(Boolean(detail.waking));
      if (detail.recovered) {
        setWorkspaceRefreshKey((k) => k + 1);
      }
    };

    const onSessionResumed = () => {
      setWorkspaceRefreshKey((k) => k + 1);
    };

    window.addEventListener('roseland:backend-waking', onBackendWaking);
    window.addEventListener('roseland:session-resumed', onSessionResumed);
    return () => {
      window.removeEventListener('roseland:backend-waking', onBackendWaking);
      window.removeEventListener('roseland:session-resumed', onSessionResumed);
    };
  }, []);

  // Authentication barrier
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    const token = AuthService.getToken();

    if (!token || !user) {
      const redirectTarget = pathname || '/';
      router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    setCurrentUser(user);
    setIsAuthenticating(false);
  }, [router, pathname]);

  // Close mobile sidebar automatically on route navigation
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // Global Keyboard shortcuts: Ctrl+B (sidebar) and Ctrl+K / '/' (command palette)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar: Ctrl + B / Cmd + B
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }

      // Open Command Palette: Ctrl + K / Cmd + K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }

      // Quick search on slash '/' when not inside an active input
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isAuthenticating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-brand-bg font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">Verifying session...</p>
        </div>
      </div>
    );
  }

  const resolvedName = currentUser?.fullName || currentUser?.username || userName || 'Staff Member';
  const resolvedRole = currentUser?.assignedClass
    ? `${currentUser.assignedClass} Form Master`
    : (currentUser?.role ? currentUser.role.replace(/_/g, ' ') : userRole || 'Faculty');
  const resolvedAvatar = currentUser?.avatar || userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=4F46E5&color=fff`;

  return (
    <div className="flex h-screen overflow-hidden font-sans antialiased bg-brand-bg text-brand-textMain">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden transition-opacity cursor-pointer animate-fade-in" 
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SIDEBAR */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        portalName={portalName}
        userName={resolvedName}
        userRole={resolvedRole}
        userAvatar={resolvedAvatar}
        navItems={navItems}
        navGroups={navGroups}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-brand-bg relative min-w-0">
        <TopHeader 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          headerContent={headerContent}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        {isBackendWaking && (
          <div className="bg-brand-violet/10 border-b border-brand-violet/20 px-4 py-2 flex items-center justify-center gap-2.5 text-xs font-semibold text-brand-violet animate-fade-in">
            <div className="w-3.5 h-3.5 border-2 border-brand-violet border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Waking up cloud server from standby — loading your portal data, please wait a moment...</span>
          </div>
        )}
        
        {/* Scrollable Content */}
        <div key={workspaceRefreshKey} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20">
          {children}
        </div>
      </main>

      {/* Universal Command Palette (Ctrl+K) */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
