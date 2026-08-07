"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RoselandApi } from '@/lib/api';
import { executiveNavGroups } from '@/lib/executiveNav';

interface CommandItem {
  id: string;
  category: 'Pages & Modules' | 'Students (SIS)' | 'Faculty & Staff' | 'Quick Actions';
  title: string;
  subtitle?: string;
  href: string;
  icon: string;
  badge?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [students, setStudents] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Load students & faculty for search indexing
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSearchData = async () => {
      try {
        setIsLoading(true);
        const [studentsRes, facultyRes] = await Promise.allSettled([
          RoselandApi.sis.getStudents(),
          RoselandApi.academic.getFacultyAllocations()
        ]);

        if (isMounted) {
          if (studentsRes.status === 'fulfilled') {
            const raw = studentsRes.value;
            const list = Array.isArray(raw)
              ? raw
              : Array.isArray(raw?.students)
              ? raw.students
              : Array.isArray(raw?.data)
              ? raw.data
              : [];
            setStudents(list);
          }

          if (facultyRes.status === 'fulfilled') {
            const raw = facultyRes.value;
            const list = Array.isArray(raw) ? raw : [];
            setFaculty(list);
          }
        }
      } catch (err) {
        console.warn("Could not load search index", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSearchData();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Quick Action templates
  const quickActions: CommandItem[] = useMemo(() => [
    {
      id: 'qa-enroll-student',
      category: 'Quick Actions',
      title: 'Enrol New Scholar (Admissions & SIS)',
      subtitle: 'Create a new student profile in the School Information System',
      href: '/admin/students',
      icon: 'ph ph-user-plus'
    },
    {
      id: 'qa-bece-analytics',
      category: 'Quick Actions',
      title: 'Open BECE Mock Analytics & Candidates',
      subtitle: 'Track Stanine trajectories, candidates, and clinics',
      href: '/headmaster/bece-analytics',
      icon: 'ph ph-chart-line-up'
    },
    {
      id: 'qa-collect-fee',
      category: 'Quick Actions',
      title: 'Record Fee Receipt & Payment',
      subtitle: 'Issue bursary receipt and update student ledger',
      href: '/admin/finance',
      icon: 'ph ph-receipt'
    },
    {
      id: 'qa-inspect-schemes',
      category: 'Quick Actions',
      title: 'Vet Teacher Lesson Schemes',
      subtitle: 'Review pending GES/NaCCA lesson plans',
      href: '/headmaster/inspections',
      icon: 'ph ph-clipboard-text'
    },
    {
      id: 'qa-broadcast-sms',
      category: 'Quick Actions',
      title: 'Send Emergency / Parent SMS Broadcast',
      subtitle: 'Dispatch announcements to parent contacts',
      href: '/admin/communications',
      icon: 'ph ph-broadcast'
    }
  ], []);

  // Base navigation items from executiveNavGroups
  const navItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];
    executiveNavGroups.forEach(group => {
      group.items.forEach(item => {
        items.push({
          id: `nav-${item.href}`,
          category: 'Pages & Modules',
          title: item.name,
          subtitle: group.title,
          href: item.href,
          icon: item.icon
        });
      });
    });
    return items;
  }, []);

  // Filtered results computation
  const filteredResults: CommandItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      // Default: Return Frequent Quick Actions & Top Navigation pages
      return [
        ...quickActions.slice(0, 3),
        ...navItems.slice(0, 4)
      ];
    }

    const results: CommandItem[] = [];

    // 1. Match Pages & Modules
    const matchedNav = navItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );
    results.push(...matchedNav);

    // 2. Match Students (SIS)
    const matchedStudents = students
      .filter(s => {
        const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
        const indexNo = (s.index_number || s.student_id || s.student_index_no || '').toLowerCase();
        const grade = (s.class_grade || s.grade || '').toLowerCase();
        return fullName.includes(q) || indexNo.includes(q) || grade.includes(q);
      })
      .slice(0, 6)
      .map(s => {
        const fullName = s.first_name && s.last_name
          ? `${s.first_name} ${s.last_name}`
          : s.student_name || s.name || 'Enrolled Scholar';
        const indexNo = s.index_number || s.student_id || s.student_index_no || '';
        const grade = s.class_grade || s.grade || 'Pupil';

        return {
          id: `student-${s.id || indexNo}`,
          category: 'Students (SIS)' as const,
          title: fullName,
          subtitle: `${indexNo} • ${grade}${s.parent_phone ? ` • Parent: ${s.parent_phone}` : ''}`,
          href: `/admin/students?search=${encodeURIComponent(indexNo || fullName)}`,
          icon: 'ph ph-student',
          badge: grade
        };
      });
    results.push(...matchedStudents);

    // 3. Match Faculty & Staff
    const matchedFaculty = faculty
      .filter(f => {
        const name = (f.faculty_name || f.teacher_name || f.name || '').toLowerCase();
        const subject = (f.subject_name || f.subject || '').toLowerCase();
        const grade = (f.class_grade || '').toLowerCase();
        return name.includes(q) || subject.includes(q) || grade.includes(q);
      })
      .slice(0, 4)
      .map(f => {
        const name = f.faculty_name || f.teacher_name || f.name || 'Faculty Member';
        const subject = f.subject_name || f.subject || 'Educator';
        const grade = f.class_grade ? ` (${f.class_grade})` : '';

        return {
          id: `faculty-${f.id || name}`,
          category: 'Faculty & Staff' as const,
          title: name,
          subtitle: `${subject}${grade} • Academic Faculty`,
          href: `/admin/staff?search=${encodeURIComponent(name)}`,
          icon: 'ph ph-chalkboard-teacher'
        };
      });
    results.push(...matchedFaculty);

    // 4. Match Quick Actions
    const matchedActions = quickActions.filter(qa =>
      qa.title.toLowerCase().includes(q) ||
      (qa.subtitle && qa.subtitle.toLowerCase().includes(q))
    );
    results.push(...matchedActions);

    return results;
  }, [query, navItems, quickActions, students, faculty]);

  // Handle keyboard navigation inside the palette
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : Math.max(0, filteredResults.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        const target = filteredResults[selectedIndex];
        onClose();
        router.push(target.href);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filteredResults, selectedIndex, onClose, router]);

  if (!isOpen) return null;

  // Group results by category
  const groupedResults: { [key: string]: CommandItem[] } = {};
  filteredResults.forEach(item => {
    if (!groupedResults[item.category]) {
      groupedResults[item.category] = [];
    }
    groupedResults[item.category].push(item);
  });

  let runningIndex = -1;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/50 backdrop-blur-xs transition-opacity animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[80vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-gray-100 gap-3 bg-white">
          <i className="ph ph-magnifying-glass text-xl text-brand-violet shrink-0"></i>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search scholars, index #, faculty, pages, or actions..."
            className="w-full text-sm font-medium text-brand-textMain placeholder-gray-400 bg-transparent border-none outline-none focus:ring-0"
          />
          {query && (
            <button 
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="text-xs text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <i className="ph ph-x"></i>
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-mono font-bold text-gray-400 bg-gray-100 rounded-md border border-gray-200">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 max-h-[60vh]">
          {isLoading && students.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <i className="ph ph-spinner animate-spin text-xl text-brand-violet block mb-2 mx-auto"></i>
              Indexing school records...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-lg">
                <i className="ph ph-magnifying-glass"></i>
              </div>
              <p className="text-xs font-bold text-brand-textMain">No matching records found for "{query}"</p>
              <p className="text-[11px] text-gray-400">Try searching by student name, index number (e.g. ROS-2026), faculty, or page title.</p>
            </div>
          ) : (
            Object.entries(groupedResults).map(([category, items]) => (
              <div key={category} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {category}
                </div>
                <div className="space-y-0.5">
                  {items.map(item => {
                    runningIndex += 1;
                    const itemIndex = runningIndex;
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        onClick={() => {
                          onClose();
                          router.push(item.href);
                        }}
                        className={`px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-brand-violet text-white shadow-sm' 
                            : 'text-brand-textMain hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shrink-0 ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-purple-50 text-brand-violet'
                          }`}>
                            <i className={item.icon}></i>
                          </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-brand-textMain'}`}>
                              {item.title}
                            </div>
                            {item.subtitle && (
                              <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                {item.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isSelected 
                                ? 'bg-white/20 text-white' 
                                : 'bg-purple-50 text-purple-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] font-mono text-white/90 flex items-center gap-1 font-bold">
                              Select <i className="ph ph-arrow-elbow-down-left"></i>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-[9px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-[9px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono text-[9px]">↵</kbd>
              Open
            </span>
          </div>
          <span className="text-[10px] font-medium text-brand-violet">
            Universal School Omnibar
          </span>
        </div>
      </div>
    </div>
  );
}
