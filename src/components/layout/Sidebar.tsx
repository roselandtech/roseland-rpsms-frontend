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

  const displayName = currentUser?.fullName || userName;
  const displayRole = currentUser?.assignedClass 
    ? `${currentUser.assignedClass} Form Master` 
    : (currentUser?.role ? currentUser.role.replace(/_/g, ' ') : userRole);

  return (
    <aside 
      className={`bg-white h-full border-r border-gray-100 flex flex-col fixed inset-y-0 left-0 lg:static z-50 lg:z-20 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none ${
        isCollapsed ? 'lg:w-20' : 'lg:w-72'
      } ${
        isOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Logo Area */}
      <div className={`h-20 flex items-center border-b border-gray-100 shrink-0 ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-6'
      }`}>
        <Link href="/" className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            <img src="/logo.png" alt="Roseland Crest" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="font-bold text-base leading-tight text-black font-serif truncate">Roseland Prep</h1>
              <p className="text-[10px] text-brand-violet font-bold uppercase tracking-wider truncate">Roselyn {portalName}</p>
            </div>
          )}
        </Link>

        {/* Close button for mobile */}
        <button 
          type="button"
          aria-label="Close menu"
          className="lg:hidden text-gray-500 hover:text-brand-violet p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          onClick={() => setIsOpen(false)}
        >
          <i className="ph-bold ph-x text-lg"></i>
        </button>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 overflow-y-auto py-5 space-y-6 ${
        isCollapsed ? 'px-2' : 'px-3'
      }`}>
        {navGroups && navGroups.length > 0 ? (
          navGroups.map((group, gIdx) => (
            <div key={group.title || gIdx} className="space-y-1">
              {!isCollapsed ? (
                <p className="px-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest mb-1.5 truncate">
                  {group.title}
                </p>
              ) : (
                <div className="w-6 h-0.5 bg-gray-100 mx-auto my-2 rounded"></div>
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
                      className={`w-full flex items-center rounded-xl text-xs transition-colors outline-none focus:outline-none ${
                        isCollapsed 
                          ? 'justify-center p-3' 
                          : 'justify-between px-3.5 py-2.5'
                      } ${
                        isActive 
                          ? 'bg-brand-violetLight text-brand-violet font-bold' 
                          : 'font-semibold text-black hover:bg-gray-100 hover:text-black'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`${item.icon} text-lg shrink-0 ${isActive ? 'text-brand-violet' : 'text-gray-900 group-hover:text-black'}`}></i>
                        {!isCollapsed && (
                          <span className={`truncate ${isActive ? 'text-brand-violet font-bold' : 'text-black font-semibold'}`}>
                            {item.name}
                          </span>
                        )}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span 
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                            item.badgeColor || 'bg-brand-yellowLight text-yellow-900'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Small Dot indicator if collapsed */}
                      {isCollapsed && item.badge && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 border border-white"></span>
                      )}
                    </Link>

                    {/* Accordion for Expanded Mode */}
                    {item.subItems && !isCollapsed && (
                      <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-64 group-hover:opacity-100 transition-all duration-500 ease-in-out ml-11 mt-0.5 space-y-0.5">
                        {item.subItems.map((sub) => (
                          <Link 
                            key={sub.href} 
                            href={sub.href} 
                            onClick={() => setIsOpen(false)}
                            className="block px-3 py-2 text-xs font-semibold text-black hover:text-brand-violet hover:bg-brand-violetLight/40 rounded-lg transition-colors"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    )}

                    {/* Floating Tooltip / Flyout in Collapsed Mode */}
                    {isCollapsed && !item.subItems && (
                      <div className="fixed left-20 ml-2 hidden group-hover:flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none animate-fade-in">
                        <span>{item.name}</span>
                      </div>
                    )}
                    {isCollapsed && item.subItems && (
                      <div className="fixed left-20 ml-2 hidden group-hover:flex flex-col bg-gray-900 text-white text-xs font-semibold p-2 rounded-xl shadow-xl z-50 animate-fade-in gap-1">
                        <div className="text-[10px] text-gray-400 uppercase tracking-widest px-2 pb-1 border-b border-gray-700 mb-1">{item.name}</div>
                        {item.subItems.map((sub) => (
                          <Link 
                            key={sub.href} 
                            href={sub.href}
                            className="px-3 py-1.5 hover:bg-gray-800 rounded-lg whitespace-nowrap transition-colors"
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
              <p className="px-3 text-[10px] font-bold text-gray-800 uppercase tracking-widest mb-2">Main Menu</p>
            )}
            {navItems?.map((item) => {
              const isActive = pathname === item.href;
              return (
                <div key={item.href} className="relative group">
                  <Link 
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`w-full flex items-center rounded-xl text-xs transition-colors outline-none focus:outline-none ${
                      isCollapsed 
                        ? 'justify-center p-3' 
                        : 'justify-between px-3.5 py-2.5'
                    } ${
                      isActive 
                        ? 'bg-brand-violetLight text-brand-violet font-bold' 
                        : 'font-semibold text-black hover:bg-gray-100 hover:text-black'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <i className={`${item.icon} text-lg shrink-0 ${isActive ? 'text-brand-violet' : 'text-gray-900 group-hover:text-black'}`}></i>
                      {!isCollapsed && (
                        <span className={`truncate ${isActive ? 'text-brand-violet font-bold' : 'text-black font-semibold'}`}>
                          {item.name}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-yellowLight text-yellow-900 shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Accordion for Expanded Mode */}
                  {item.subItems && !isCollapsed && (
                    <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-64 group-hover:opacity-100 transition-all duration-500 ease-in-out ml-11 mt-0.5 space-y-0.5">
                      {item.subItems.map((sub) => (
                        <Link 
                          key={sub.href} 
                          href={sub.href} 
                          onClick={() => setIsOpen(false)}
                          className="block px-3 py-2 text-xs font-semibold text-black hover:text-brand-violet hover:bg-brand-violetLight/40 rounded-lg transition-colors"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Floating Tooltip / Flyout in Collapsed Mode */}
                  {isCollapsed && !item.subItems && (
                    <div className="fixed left-20 ml-2 hidden group-hover:flex items-center gap-2 bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl z-50 whitespace-nowrap pointer-events-none animate-fade-in">
                      <span>{item.name}</span>
                    </div>
                  )}
                  {isCollapsed && item.subItems && (
                    <div className="fixed left-20 ml-2 hidden group-hover:flex flex-col bg-gray-900 text-white text-xs font-semibold p-2 rounded-xl shadow-xl z-50 animate-fade-in gap-1">
                      <div className="text-[10px] text-gray-400 uppercase tracking-widest px-2 pb-1 border-b border-gray-700 mb-1">{item.name}</div>
                      {item.subItems.map((sub) => (
                        <Link 
                          key={sub.href} 
                          href={sub.href}
                          className="px-3 py-1.5 hover:bg-gray-800 rounded-lg whitespace-nowrap transition-colors"
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

      {/* Collapse Toggle & User Profile (Bottom) */}
      <div className="p-3 border-t border-gray-100 shrink-0 bg-gray-50/50 space-y-2">
        {/* Desktop Collapse / Expand Button */}
        {setIsCollapsed && (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center justify-center py-2 text-xs font-bold text-gray-500 hover:text-brand-violet hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all gap-2"
            title={isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
          >
            <i className={`ph-bold ${isCollapsed ? 'ph-caret-double-right' : 'ph-caret-double-left'} text-sm`}></i>
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>
        )}

        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-2 py-1'}`}>
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-gray-200 shadow-sm shrink-0">
            <i className="ph-bold ph-user-circle text-gray-400 text-2xl"></i>
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-black truncate">{displayName}</p>
              <p className="text-[10px] font-semibold text-brand-violet truncate">{displayRole}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
