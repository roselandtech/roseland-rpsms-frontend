"use client";

import { usePathname } from 'next/navigation';

interface TopHeaderProps {
  toggleSidebar: () => void;
  headerContent?: React.ReactNode;
  onOpenCommandPalette?: () => void;
}

export default function TopHeader({ toggleSidebar, headerContent, onOpenCommandPalette }: TopHeaderProps) {
  const pathname = usePathname();
  
  const getHeaderInfo = () => {
    const path = pathname.split('/').pop() || 'dashboard';
    const formatted = path.charAt(0).toUpperCase() + path.slice(1);
    return {
      title: formatted,
      subtitle: 'Overview and statistics'
    };
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-10 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          className="text-gray-500 hover:text-brand-violet p-2 -ml-2 rounded-lg bg-gray-50 transition-colors lg:hidden cursor-pointer" 
          onClick={toggleSidebar}
        >
          <i className="ph ph-list text-2xl"></i>
        </button>
        {headerContent ? headerContent : (
          <div>
            <h2 className="text-xl font-bold text-brand-textMain leading-none">{title}</h2>
            <p className="text-xs text-brand-textMuted mt-1 hidden sm:block">{subtitle}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Command Palette Trigger Omnibar */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center justify-between gap-3 px-3.5 py-2 bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/60 rounded-full text-xs text-gray-400 hover:text-gray-600 transition-all w-52 lg:w-72 cursor-pointer group shadow-2xs"
          title="Search scholars, faculty, pages (Ctrl + K)"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <i className="ph ph-magnifying-glass text-brand-violet text-sm group-hover:scale-110 transition-transform"></i>
            <span className="truncate text-gray-500 font-medium">Search anything...</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-400 bg-white rounded border border-gray-200 shadow-2xs">
              Ctrl
            </kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-gray-400 bg-white rounded border border-gray-200 shadow-2xs">
              K
            </kbd>
          </div>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button className="relative p-2 text-gray-500 hover:text-brand-violet transition-colors rounded-full hover:bg-gray-50 cursor-pointer">
            <i className="ph ph-bell text-xl"></i>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-violet rounded-full border border-white"></span>
          </button>
        </div>
      </div>
    </header>
  );
}
