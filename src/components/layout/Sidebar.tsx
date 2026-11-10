"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthService, RoselandUser } from '@/lib/auth';

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  badge?: string | number;
  badgeColor?: string;
  subItems?: { name: string; href: string }[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (val: boolean) => void;
  portalName: string;
  userName: string;
  userRole: string;
  userAvatar: string;
  navItems?: NavItem[];
  navGroups?: NavGroup[];
}

export default function Sidebar({ 
  isOpen, 
  setIsOpen, 
  isCollapsed = false,
  setIsCollapsed,
  portalName, 
  userName, 
  userRole, 
  userAvatar, 
  navItems,
  navGroups 
}: SidebarProps) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);

  useEffect(() => {
    setCurrentUser(AuthService.getCurrentUser());
  }, []);

  const displayName = currentUser?.fullName || userName || 'Administrator';
  const displayRole = currentUser?.assignedClass 
    ? `${currentUser.assignedClass} Form Master` 
    : (currentUser?.role ? currentUser.role.replace(/_/g, ' ') : userRole || 'Headmaster');

  // Compute clean user initials for avatar pill
  const userInitials = (displayName || 'RP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'RP';

  const firstName = displayName.split(' ')[0] || displayName;

  return (
    <aside 
      className={`bg-gradient-to-b from-[#211A58] via-[#1A1448] to-[#120D34] text-white h-full border-r border-indigo-900/40 flex flex-col fixed inset-y-0 left-0 lg:static z-50 lg:z-20 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none select-none ${
        isCollapsed ? 'lg:w-20' : 'lg:w-72'
      } ${
        isOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* 1. BRAND HEADER AREA */}
      <div className={`h-20 flex items-center border-b border-white/[0.08] shrink-0 ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-6'
      }`}>
        <Link href="/" className="flex items-center gap-3.5 min-w-0 flex-1 group">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center transition-transform group-hover:scale-105">
            <img 
              src="/logo.png" 
              alt="Roseland Crest" 
              className="w-full h-full object-contain filter drop-shadow-sm" 
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-serif font-bold text-base leading-tight text-white tracking-tight truncate">
                Rosalind Prep
              </h1>
              <p className="text-xs text-indigo-200/80 font-normal tracking-wide truncate mt-0.5">
                Academic Excellence
              </p>
            </div>
          )}
        </Link>

        {/* Close button for mobile screens */}
        <button 
          type="button"
          aria-label="Close menu"
          className="lg:hidden text-indigo-200 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          onClick={() => setIsOpen(false)}
        >
          <i className="ph-bold ph-x text-lg"></i>
        </button>
      </div>

      {/* 2. TOP USER PROFILE CARD (Directly below brand, matching design mockup) */}
      <div className={`shrink-0 pt-4 pb-2 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {isCollapsed ? (
          <div 
            className="w-12 h-12 mx-auto rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center cursor-pointer transition-all relative group"
            title={`${displayName} (${displayRole})`}
          >
            <div className="w-9 h-9 rounded-full bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center shadow-inner relative">
              {userInitials}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1A1448]"></span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/10 transition-all flex items-center justify-between cursor-pointer group shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#4F46E5] text-white text-xs font-bold flex items-center justify-center shadow-inner shrink-0 relative">
                {userInitials}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1A1448]"></span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-indigo-100 transition-colors">
                    {firstName}
                  </p>
                  <i className="ph-bold ph-caret-down text-xs text-indigo-300"></i>
                </div>
                <p className="text-xs text-indigo-300 font-normal truncate mt-0.5 leading-tight">
                  {displayRole}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. NAVIGATION LINKS AREA */}
      <nav className={`flex-1 overflow-y-auto py-3 space-y-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent ${
        isCollapsed ? 'px-2' : 'px-3'
      }`}>
        {navGroups && navGroups.length > 0 ? (
          navGroups.map((group, gIdx) => (
            <div key={group.title || gIdx} className="space-y-1">
              {!isCollapsed ? (
                <div className="flex items-center gap-3 px-3 pt-3 pb-1.5">
                  <span className="text-[10px] font-bold tracking-widest text-indigo-300/80 uppercase shrink-0 truncate">
                    {group.title}
                  </span>
                  <div className="h-px bg-white/10 flex-1"></div>
                </div>
              ) : (
                <div className="w-6 h-0.5 bg-white/10 mx-auto my-3 rounded-full"></div>
              )}

              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (pathname.startsWith(item.href + '/') &&
                    item.href !== '/admin' &&
                    item.href !== '/headmaster' &&
                    item.href !== '/teacher' &&
                    item.href !== '/parent' &&
                    item.href !== '/bursar' &&
                    item.href !== '/admin/academics');
                return (
                  <div key={item.href} className="relative group">
                    <Link 
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`w-full flex items-center rounded-2xl text-xs transition-all outline-none focus:outline-none ${
                        isCollapsed 
                          ? 'justify-center p-3' 
                          : 'justify-between px-3.5 py-2.5'
                      } ${
                        isActive 
                          ? 'bg-[#4F46E5] text-white font-semibold shadow-md shadow-indigo-950/40' 
                          : 'text-indigo-100/90 hover:text-white hover:bg-white/10 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <i className={`${item.icon} text-lg shrink-0 ${isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`}></i>
                        {!isCollapsed && (
                          <span className={`truncate ${isActive ? 'text-white font-semibold' : 'text-indigo-100/90 group-hover:text-white font-medium'}`}>
                            {item.name}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span 
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-full shrink-0 shadow-xs ${
                            item.badgeColor || 'bg-[#EF4444] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Small notification dot if collapsed */}
                      {isCollapsed && item.badge && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444] ring-2 ring-[#1A1448]"></span>
                      )}
                    </Link>

                    {/* Accordion for Expanded Mode */}
                    {item.subItems && !isCollapsed && (
                      <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-64 group-hover:opacity-100 transition-all duration-300 ease-in-out ml-9 mt-1 space-y-0.5 pl-2 border-l border-white/10">
                        {item.subItems.map((sub) => (
                          <Link 
                            key={sub.href} 
                            href={sub.href} 
                            onClick={() => setIsOpen(false)}
                            className="block px-3 py-1.5 text-xs font-medium text-indigo-200/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors truncate"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Floating Tooltip in Collapsed Mode */}
                    {isCollapsed && !item.subItems && (
                      <div className="fixed left-20 ml-2 hidden group-hover:flex items-center gap-2 bg-[#120D34] text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-white/10 z-50 whitespace-nowrap pointer-events-none animate-fade-in">
                        <span>{item.name}</span>
                      </div>
                    )}
                    {isCollapsed && item.subItems && (
                      <div className="fixed left-20 ml-2 hidden group-hover:flex flex-col bg-[#120D34] text-white text-xs font-semibold p-2.5 rounded-2xl shadow-2xl border border-white/10 z-50 animate-fade-in gap-1">
                        <div className="text-[10px] text-indigo-300 uppercase tracking-widest px-2 pb-1 border-b border-white/10 mb-1">
                          {item.name}
                        </div>
                        {item.subItems.map((sub) => (
                          <Link 
                            key={sub.href} 
                            href={sub.href}
                            className="px-3 py-1.5 hover:bg-white/10 rounded-xl whitespace-nowrap transition-colors text-indigo-100"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-3 pt-3 pb-1.5">
                <span className="text-[10px] font-bold tracking-widest text-indigo-300/80 uppercase shrink-0">
                  Main Menu
                </span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
            )}
            {navItems?.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative group">
                  <Link 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`w-full flex items-center rounded-2xl text-xs transition-all outline-none focus:outline-none ${
                      isCollapsed 
                        ? 'justify-center p-3' 
                        : 'justify-between px-3.5 py-2.5'
                    } ${
                      isActive 
                        ? 'bg-[#4F46E5] text-white font-semibold shadow-md shadow-indigo-950/40' 
                        : 'text-indigo-100/90 hover:text-white hover:bg-white/10 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <i className={`${item.icon} text-lg shrink-0 ${isActive ? 'text-white' : 'text-indigo-300 group-hover:text-white'}`}></i>
                      {!isCollapsed && (
                        <span className={`truncate ${isActive ? 'text-white font-semibold' : 'text-indigo-100/90 group-hover:text-white font-medium'}`}>
                          {item.name}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#EF4444] text-white shrink-0 shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Accordion for Expanded Mode */}
                  {item.subItems && !isCollapsed && (
                    <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-64 group-hover:opacity-100 transition-all duration-300 ease-in-out ml-9 mt-1 space-y-0.5 pl-2 border-l border-white/10">
                      {item.subItems.map((sub) => (
                        <Link 
                          key={sub.href} 
                          href={sub.href} 
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-1.5 text-xs font-medium text-indigo-200/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors truncate"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Floating Tooltip in Collapsed Mode */}
                  {isCollapsed && !item.subItems && (
                    <div className="fixed left-20 ml-2 hidden group-hover:flex items-center gap-2 bg-[#120D34] text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl border border-white/10 z-50 whitespace-nowrap pointer-events-none animate-fade-in">
                      <span>{item.name}</span>
                    </div>
                  )}
                  {isCollapsed && item.subItems && (
                    <div className="fixed left-20 ml-2 hidden group-hover:flex flex-col bg-[#120D34] text-white text-xs font-semibold p-2.5 rounded-2xl shadow-2xl border border-white/10 z-50 animate-fade-in gap-1">
                      <div className="text-[10px] text-indigo-300 uppercase tracking-widest px-2 pb-1 border-b border-white/10 mb-1">
                        {item.name}
                      </div>
                      {item.subItems.map((sub) => (
                        <Link 
                          key={sub.href} 
                          href={sub.href}
                          className="px-3 py-1.5 hover:bg-white/10 rounded-xl whitespace-nowrap transition-colors text-indigo-100"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>

      {/* 4. FOOTER UTILITIES: COLLAPSE BUTTON & NEED HELP CARD */}
      <div className={`p-3 border-t border-white/[0.08] shrink-0 space-y-2.5 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {/* Desktop Collapse / Expand Button */}
        {setIsCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`w-full hidden lg:flex items-center rounded-xl text-xs font-medium text-indigo-200/80 hover:text-white hover:bg-white/10 transition-all ${
              isCollapsed ? 'justify-center py-2.5' : 'gap-2.5 px-3 py-2'
            }`}
            title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          >
            <i className={`ph-bold ${isCollapsed ? 'ph-caret-double-right' : 'ph-caret-left'} text-sm`}></i>
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>
        )}

        {/* Need Help? Contact Support Card */}
        {!isCollapsed ? (
          <Link
            href="/admin/communications"
            className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <i className="ph-bold ph-headset text-base"></i>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white leading-tight">Need Help?</p>
                <p className="text-[10px] text-indigo-300 leading-tight mt-0.5 truncate">Contact Support</p>
              </div>
            </div>
            <i className="ph-bold ph-caret-right text-xs text-indigo-300 group-hover:translate-x-0.5 transition-transform shrink-0"></i>
          </Link>
        ) : (
          <Link
            href="/admin/communications"
            title="Need Help? Contact Support"
            className="w-10 h-10 mx-auto rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-indigo-300 hover:text-white transition-all"
          >
            <i className="ph-bold ph-headset text-base"></i>
          </Link>
        )}
      </div>
    </aside>
  );
}