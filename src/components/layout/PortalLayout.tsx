"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar, { NavItem, NavGroup } from './Sidebar';
import TopHeader from './TopHeader';
import CommandPalette from './CommandPalette';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';
import { filterNavGroupsByPermissions, filterNavItemsByPermissions, isHrefAllowedByPermissions } from '@/lib/executiveNav';

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

  // Authentication barrier & live session integrity gatekeeper
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

    // 1. Immediately verify active account status with the Auth Microservice
    const checkLiveSession = () => {
      RoselandApi.auth.me()
        .then((res: any) => {
          if (!res || !res.user) {
            AuthService.logout('/login?suspended=true');
            return;
          }
          if (res.user.isActive === false || res.user.portalAccess === 'DISABLED' || res.user.portalAccess === 'SUSPENDED') {
            AuthService.logout('/login?suspended=true');
          }
        })
        .catch(() => {
          // If 401 Unauthorized or deactivated, immediately revoke session
          AuthService.logout('/login?suspended=true');
        });
    };

    checkLiveSession();

    // 2. Periodic heartbeat (every 10s) and window focus check
    const heartbeat = setInterval(checkLiveSession, 10000);
    const onFocus = () => checkLiveSession();
    window.addEventListener('focus', onFocus);

    // 3. Listen for immediate cross-tab session revocation broadcast
    const handleStorageRevoke = (e: StorageEvent) => {
      if (e.key === 'roseland_session_revoke') {
        try {
          const data = JSON.parse(e.newValue || '{}');
          if (data.userId === user.id || data.all) {
            AuthService.logout('/login?suspended=true');
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageRevoke);

    // Sync live role permissions from the backend RBAC matrix so any permission
    // changes saved by the System Admin take effect immediately in the sidebar
    const targetRole = user.role === 'SUPER_ADMIN' ? 'HEADMASTER' : user.role;
    RoselandApi.auth.getRolePermissions()
      .then((matrix: any) => {
        if (!Array.isArray(matrix)) return;
        const matched = matrix.find((r: any) => r.role === targetRole);
        if (matched && Array.isArray(matched.permissions)) {
          const updatedUser: RoselandUser = { ...user, permissions: matched.permissions };
          setCurrentUser(updatedUser);
          localStorage.setItem('roseland_user', JSON.stringify(updatedUser));
          if (pathname && !isHrefAllowedByPermissions(pathname, updatedUser.role, updatedUser.permissions)) {
            router.replace(AuthService.getPortalUrlForUser(updatedUser));
          }
        }
      })
      .catch(() => {});

    const handlePermissionsUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || !detail.role || !Array.isArray(detail.permissions)) return;
      const latestUser = AuthService.getCurrentUser();
      if (!latestUser) return;
      const effectiveRole = latestUser.role === 'SUPER_ADMIN' ? 'HEADMASTER' : latestUser.role;
      if (detail.role === effectiveRole) {
        const updatedUser: RoselandUser = { ...latestUser, permissions: detail.permissions };
        setCurrentUser(updatedUser);
        localStorage.setItem('roseland_user', JSON.stringify(updatedUser));
      }
    };

    window.addEventListener('roseland:permissions-updated', handlePermissionsUpdated);
    return () => {
      clearInterval(heartbeat);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', handleStorageRevoke);
      window.removeEventListener('roseland:permissions-updated', handlePermissionsUpdated);
    };
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
  const resolvedRole = currentUser?.role === 'ADMIN'
    ? 'System Administrator (RBAC)'
    : currentUser?.role === 'HEADMASTER' || currentUser?.role === 'SUPER_ADMIN'
      ? (currentUser?.assignedClass ? `Headmaster • ${currentUser.assignedClass} Teacher` : 'Headmaster & School Leader')
      : currentUser?.assignedClass
        ? `${currentUser.assignedClass} Form Master`
        : (currentUser?.role ? currentUser.role.replace(/_/g, ' ') : userRole || 'Faculty');
  const resolvedAvatar = currentUser?.avatar || userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(resolvedName)}&background=4F46E5&color=fff`;

  const resolvedPortalName = currentUser?.role === 'ADMIN'
    ? 'System Admin'
    : currentUser?.role === 'TEACHER'
      ? 'Teacher Portal'
      : currentUser?.role === 'BURSAR'
        ? 'Bursar Portal'
        : portalName;

  // Filter navGroups and navItems dynamically based on the user's role & configured permissions
  const filteredNavGroups = navGroups
    ? filterNavGroupsByPermissions(navGroups, currentUser?.role, currentUser?.permissions)
    : undefined;

  const filteredNavItems = navItems
    ? filterNavItemsByPermissions(navItems, currentUser?.role, currentUser?.permissions)
    : undefined;

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
        portalName={resolvedPortalName}
        userName={resolvedName}
        userRole={resolvedRole}
        userAvatar={resolvedAvatar}
        navItems={filteredNavItems}
        navGroups={filteredNavGroups}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-brand-bg relative min-w-0">
        <TopHeader 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          headerContent={headerContent}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20">
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
