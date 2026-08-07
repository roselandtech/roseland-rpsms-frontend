"use client";

import { useState, useEffect } from 'react';
import PortalLayout from '@/components/layout/PortalLayout';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';

const navItems = [
  { name: 'Overview', href: '/parent', icon: 'ph ph-squares-four' },
  { name: 'Academic Records', href: '/parent/academics', icon: 'ph ph-exam' },
  { name: 'Fees & Payments', href: '/parent/finance', icon: 'ph ph-wallet' },
  { name: 'Notice Board', href: '/parent/notices', icon: 'ph ph-bell' },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [wards, setWards] = useState<{ id: string; name: string; classGrade: string }[]>([]);
  const [activeWard, setActiveWard] = useState<{ id: string; name: string; classGrade: string } | null>(null);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    
    // Fetch wards if available
    RoselandApi.sis.getStudents().then((students) => {
      if (students && Array.isArray(students) && students.length > 0) {
        const mapped = students.slice(0, 3).map((s: any) => ({
          id: s.indexNumber || s.index_number || s.id,
          name: s.fullName || s.full_name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Scholar',
          classGrade: s.classGrade || s.class_grade || 'Active Stream'
        }));
        setWards(mapped);
        if (mapped.length > 0) setActiveWard(mapped[0]);
      }
    }).catch(() => {});
  }, []);

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'SC';
  };

  const headerContent = activeWard ? (
    <div className="relative">
      <button 
        className="flex items-center gap-2 sm:gap-3 bg-gray-50 hover:bg-brand-violetLight/50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2 transition-colors focus:outline-none focus:border-brand-violet cursor-pointer" 
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-brand-violetLight text-brand-violet font-bold flex items-center justify-center text-xs sm:text-sm border border-brand-violet/20">
          {getInitials(activeWard.name)}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-bold text-brand-textMain leading-tight">{activeWard.name}</p>
          <p className="text-[10px] text-brand-textMuted font-medium uppercase tracking-wide">{activeWard.classGrade}</p>
        </div>
        {wards.length > 1 && <i className="ph ph-caret-down text-gray-400"></i>}
      </button>
      
      {isDropdownOpen && wards.length > 1 && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-fade-in">
          <div className="p-2 space-y-1">
            {wards.map((ward) => (
              <button 
                key={ward.id}
                className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors cursor-pointer ${
                  activeWard.id === ward.id ? 'bg-brand-violetLight/50 text-brand-violet font-bold' : 'hover:bg-gray-50 text-brand-textMain'
                }`} 
                onClick={() => {
                  setActiveWard(ward);
                  setIsDropdownOpen(false);
                }}
              >
                <div className="w-8 h-8 rounded-full bg-brand-violetLight text-brand-violet font-bold flex items-center justify-center text-sm border border-brand-violet/20">
                  {getInitials(ward.name)}
                </div>
                <div>
                  <p className="text-sm font-bold">{ward.name}</p>
                  <p className="text-xs text-brand-textMuted">{ward.classGrade}</p>
                </div>
                {activeWard.id === ward.id && <i className="ph-fill ph-check-circle ml-auto"></i>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="text-xs font-bold text-brand-textMuted">Parent Portal</div>
  );

  return (
    <PortalLayout 
      portalName="Parent Portal"
      navItems={navItems}
      headerContent={headerContent}
    >
      {children}
    </PortalLayout>
  );
}
