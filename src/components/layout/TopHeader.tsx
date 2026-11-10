"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';

interface TopHeaderProps {
  toggleSidebar: () => void;
  headerContent?: React.ReactNode;
  onOpenCommandPalette?: () => void;
}

export interface PortalNotification {
  id: string;
  title: string;
  description: string;
  category: 'HR' | 'ADMISSIONS' | 'ACADEMIC' | 'FINANCE' | 'BROADCAST';
  severity: 'info' | 'warning' | 'success' | 'urgent';
  timestamp: string;
  href: string;
}

export default function TopHeader({ toggleSidebar, headerContent, onOpenCommandPalette }: TopHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getHeaderInfo = () => {
    const path = pathname.split('/').pop() || 'dashboard';
    const formatted = path.charAt(0).toUpperCase() + path.slice(1);
    return {
      title: formatted,
      subtitle: 'Overview and statistics'
    };
  };

  const { title, subtitle } = getHeaderInfo();

  const getStorageKey = (user: RoselandUser | null) => {
    const id = user?.id || user?.email || user?.username || 'default';
    return `roseland_read_notifs_${id}`;
  };

  // Load persisted read notification IDs
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    const key = getStorageKey(user);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setReadIds(new Set(parsed));
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistReadIds = (nextSet: Set<string>) => {
    setReadIds(nextSet);
    const user = AuthService.getCurrentUser();
    const key = getStorageKey(user);
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(nextSet)));
    } catch {
      // ignore storage errors
    }
  };

  const fetchNotifications = useCallback(async () => {
    const user = AuthService.getCurrentUser();
    if (!user) return;

    setLoadingNotifs(true);
    const items: PortalNotification[] = [];
    const role = (user.role || '').toUpperCase();
    const isExecutive = role === 'HEADMASTER' || role === 'SUPER_ADMIN' || role === 'ADMIN';

    try {
      if (isExecutive) {
        const [leaveRes, admRes, schemesRes, logsRes] = await Promise.allSettled([
          RoselandApi.hr.getLeave(),
          RoselandApi.sis.getAdmissions(),
          RoselandApi.academic.getLessonSchemes({ status: 'Pending' }),
          RoselandApi.notify.getLogs(),
        ]);

        // 1. Pending Staff Leave Requests
        if (leaveRes.status === 'fulfilled') {
          const leaves = Array.isArray(leaveRes.value?.data)
            ? leaveRes.value.data
            : Array.isArray(leaveRes.value)
            ? leaveRes.value
            : [];
          leaves
            .filter((l: any) => String(l.status || '').toUpperCase() === 'PENDING')
            .slice(0, 6)
            .forEach((l: any) => {
              items.push({
                id: `leave-pending-${l.id}`,
                title: `Leave Approval Needed: ${l.staff_name || 'Staff Member'}`,
                description: `${l.leave_type || 'Staff'} leave requested (${l.start_date || ''} to ${l.end_date || ''}).`,
                category: 'HR',
                severity: 'urgent',
                timestamp: l.created_at ? new Date(l.created_at).toLocaleDateString() : 'Pending Action',
                href: '/admin/hr',
              });
            });
        }

        // 2. Pending Online Admissions
        if (admRes.status === 'fulfilled') {
          const admissions = Array.isArray(admRes.value?.data)
            ? admRes.value.data
            : Array.isArray(admRes.value)
            ? admRes.value
            : [];
          admissions
            .filter((a: any) => {
              const st = String(a.status || '').toUpperCase();
              return st === 'PENDING' || st === 'APPLIED' || st === 'UNDER_REVIEW';
            })
            .slice(0, 6)
            .forEach((a: any) => {
              const applicantName = a.student_name || a.full_name || `${a.first_name || ''} ${a.last_name || ''}`.trim() || 'New Applicant';
              items.push({
                id: `adm-${a.id || a.application_no || applicantName}`,
                title: `Admission Application: ${applicantName}`,
                description: `Applying for ${a.applying_for_class || a.class_grade || 'Admission'} • Guardian: ${a.parent_name || a.guardian_name || 'Parent'}`,
                category: 'ADMISSIONS',
                severity: 'info',
                timestamp: a.created_at ? new Date(a.created_at).toLocaleDateString() : 'New Application',
                href: '/admin/admissions',
              });
            });
        }

        // 3. Lesson Schemes Pending Vetting
        if (schemesRes.status === 'fulfilled') {
          const schemes = Array.isArray(schemesRes.value?.data)
            ? schemesRes.value.data
            : Array.isArray(schemesRes.value)
            ? schemesRes.value
            : [];
          schemes.slice(0, 5).forEach((sc: any) => {
            items.push({
              id: `scheme-vet-${sc.id}`,
              title: `Lesson Scheme for Vetting: ${sc.subject || 'Subject'}`,
              description: `${sc.class_grade || ''} (${sc.week || 'Current Week'}) submitted by ${sc.teacher_name || 'Faculty'}.`,
              category: 'ACADEMIC',
              severity: 'warning',
              timestamp: sc.created_at ? new Date(sc.created_at).toLocaleDateString() : 'Awaiting Vetting',
              href: '/admin/academics/schemes',
            });
          });
        }

        // 4. Recent Broadcasts
        if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
          logsRes.value.slice(0, 3).forEach((lg: any) => {
            items.push({
              id: `sms-log-${lg.id}`,
              title: `SMS Dispatch (${lg.status || 'SENT'})`,
              description: `${lg.message || ''} → ${lg.recipient || ''}`,
              category: 'BROADCAST',
              severity: 'info',
              timestamp: lg.timestamp ? new Date(lg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
              href: '/admin/communications',
            });
          });
        }
      } else if (role === 'TEACHER') {
        const teacherName = (user.fullName || '').toLowerCase();
        const [leaveRes, schemesRes, allocRes] = await Promise.allSettled([
          RoselandApi.hr.getLeave(),
          RoselandApi.academic.getLessonSchemes({ teacher_name: user.fullName }),
          RoselandApi.academic.getTeacherAllocation(user.email || user.username || user.id),
        ]);

        // 1. Leave Request Decisions
        if (leaveRes.status === 'fulfilled') {
          const leaves = Array.isArray(leaveRes.value?.data)
            ? leaveRes.value.data
            : Array.isArray(leaveRes.value)
            ? leaveRes.value
            : [];
          leaves
            .filter((l: any) => {
              const sName = String(l.staff_name || '').toLowerCase();
              return (teacherName && sName.includes(teacherName)) || l.staff_id === user.id || l.staff_id === user.email;
            })
            .slice(0, 5)
            .forEach((l: any) => {
              const st = String(l.status || 'PENDING').toUpperCase();
              items.push({
                id: `my-leave-${l.id}-${st}`,
                title: `Leave Request ${st}: ${l.leave_type || 'Leave'}`,
                description: `Your request for ${l.start_date} to ${l.end_date} is currently ${st}.`,
                category: 'HR',
                severity: st === 'APPROVED' ? 'success' : st === 'REJECTED' ? 'urgent' : 'info',
                timestamp: l.created_at ? new Date(l.created_at).toLocaleDateString() : st,
                href: '/teacher',
              });
            });
        }

        // 2. Lesson Scheme Vetting Feedback
        if (schemesRes.status === 'fulfilled') {
          const schemes = Array.isArray(schemesRes.value?.data)
            ? schemesRes.value.data
            : Array.isArray(schemesRes.value)
            ? schemesRes.value
            : [];
          schemes.slice(0, 5).forEach((sc: any) => {
            const st = String(sc.status || 'Pending');
            items.push({
              id: `my-scheme-${sc.id}-${st}`,
              title: `Lesson Note ${st}: ${sc.subject} (${sc.class_grade})`,
              description: sc.headmaster_notes
                ? `Headmaster Note: "${sc.headmaster_notes}"`
                : `${sc.week || 'Weekly'} scheme status is ${st}.`,
              category: 'ACADEMIC',
              severity: st === 'Approved' ? 'success' : st === 'Revision Requested' ? 'warning' : 'info',
              timestamp: sc.week || 'Term 1',
              href: '/teacher/lessons',
            });
          });
        }

        // 3. Active Class Allocation Notice
        if (allocRes.status === 'fulfilled' && allocRes.value) {
          const alloc = allocRes.value;
          const formClass = alloc.formClass || user.assignedClass;
          if (formClass) {
            items.push({
              id: `alloc-form-${formClass}`,
              title: `Form Master Assignment: ${formClass}`,
              description: `Daily roll call and SBA continuous assessment active for ${formClass}.`,
              category: 'ACADEMIC',
              severity: 'info',
              timestamp: 'Active Term',
              href: '/teacher/roster',
            });
          }
        }
      } else if (role === 'BURSAR') {
        const [invRes, txRes, leaveRes] = await Promise.allSettled([
          RoselandApi.finance.getInvoices(),
          RoselandApi.finance.getTransactions(),
          RoselandApi.hr.getLeave(),
        ]);

        if (invRes.status === 'fulfilled') {
          const invoices = Array.isArray(invRes.value?.data)
            ? invRes.value.data
            : Array.isArray(invRes.value)
            ? invRes.value
            : [];
          const unpaid = invoices.filter((inv: any) => Number(inv.balance ?? 0) > 0);
          if (unpaid.length > 0) {
            items.push({
              id: `bursar-arrears-${unpaid.length}`,
              title: `${unpaid.length} Scholar Invoices with Outstanding Balances`,
              description: `Review fee arrears and dispatch payment reminders from the Bursary Ledger.`,
              category: 'FINANCE',
              severity: 'warning',
              timestamp: 'Live Ledger',
              href: '/bursar',
            });
          }
        }

        if (txRes.status === 'fulfilled') {
          const txs = Array.isArray(txRes.value?.data)
            ? txRes.value.data
            : Array.isArray(txRes.value)
            ? txRes.value
            : [];
          txs.slice(0, 5).forEach((tx: any) => {
            items.push({
              id: `bursar-tx-${tx.id || tx.receipt_no || tx.reference}`,
              title: `Fee Payment Received: GHS ${Number(tx.amount || 0).toLocaleString()}`,
              description: `${tx.student_name || tx.payer_name || 'Scholar'} • ${tx.payment_method || tx.network || 'Payment'} (${tx.receipt_no || tx.reference || 'Receipt'})`,
              category: 'FINANCE',
              severity: 'success',
              timestamp: tx.created_at ? new Date(tx.created_at).toLocaleDateString() : 'Recorded',
              href: '/bursar',
            });
          });
        }

        if (leaveRes.status === 'fulfilled') {
          const leaves = Array.isArray(leaveRes.value?.data) ? leaveRes.value.data : Array.isArray(leaveRes.value) ? leaveRes.value : [];
          const myLeaves = leaves.filter((l: any) => l.staff_id === user.id || l.staff_id === user.email);
          myLeaves.slice(0, 2).forEach((l: any) => {
            items.push({
              id: `bursar-leave-${l.id}-${l.status}`,
              title: `Leave Status: ${l.status}`,
              description: `${l.leave_type} (${l.start_date} – ${l.end_date})`,
              category: 'HR',
              severity: 'info',
              timestamp: l.status,
              href: '/bursar',
            });
          });
        }
      } else if (role === 'PARENT') {
        const [stuRes, invRes] = await Promise.allSettled([
          RoselandApi.sis.getStudents(),
          RoselandApi.finance.getInvoices(),
        ]);

        const allStudents = stuRes.status === 'fulfilled'
          ? (Array.isArray(stuRes.value?.data) ? stuRes.value.data : Array.isArray(stuRes.value) ? stuRes.value : [])
          : [];
        const allInvoices = invRes.status === 'fulfilled'
          ? (Array.isArray(invRes.value?.data) ? invRes.value.data : Array.isArray(invRes.value) ? invRes.value : [])
          : [];

        const wardIds = new Set<string>([
          ...(Array.isArray(user.wardIndexNumbers) ? user.wardIndexNumbers : []),
          ...(Array.isArray(user.wardIds) ? user.wardIds : []),
          ...(user.studentIndexNo ? [user.studentIndexNo] : []),
        ]);
        const userPhoneDigits = (user.phone || user.username || '').replace(/\D/g, '').slice(-9);
        const userEmailLower = (user.email || '').toLowerCase();

        const myWards = allStudents.filter((s: any) => {
          const sIdx = s.index_no || s.index_number || s.id;
          if (wardIds.has(sIdx)) return true;
          const pPhoneDigits = String(s.parent_phone || s.emergency_phone || '').replace(/\D/g, '').slice(-9);
          if (userPhoneDigits && userPhoneDigits.length >= 9 && pPhoneDigits === userPhoneDigits) return true;
          if (userEmailLower && String(s.parent_email || '').toLowerCase() === userEmailLower) return true;
          return false;
        });

        myWards.forEach((w: any) => {
          const sIdx = w.index_no || w.index_number || w.id;
          const wName = w.full_name || `${w.first_name || ''} ${w.last_name || ''}`.trim();
          items.push({
            id: `ward-status-${sIdx}`,
            title: `Academic & Attendance Pulse: ${wName}`,
            description: `${w.class_grade} • Attendance: ${Math.round(Number(w.attendance_pct ?? 100))}% • CA Avg: ${Number(w.avg_score) > 0 ? Math.round(Number(w.avg_score)) + '%' : 'In Progress'}`,
            category: 'ACADEMIC',
            severity: 'info',
            timestamp: 'Current Term',
            href: '/parent',
          });

          const wardInvoices = allInvoices.filter(
            (inv: any) => (inv.student_index_no || inv.studentIndexNo) === sIdx && Number(inv.balance ?? 0) > 0
          );
          wardInvoices.forEach((inv: any) => {
            items.push({
              id: `ward-inv-${inv.id || inv.invoice_no || sIdx}`,
              title: `Fee Balance Due for ${wName}`,
              description: `Outstanding Balance: GHS ${Number(inv.balance || 0).toLocaleString()} (${inv.term || 'Current Term'}). Click to pay via Mobile Money.`,
              category: 'FINANCE',
              severity: 'warning',
              timestamp: inv.status || 'Unpaid',
              href: '/parent',
            });
          });
        });
      }
    } catch (err) {
      console.warn('Notification fetch error:', err);
    } finally {
      setLoadingNotifs(false);
    }

    setNotifications(items);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, pathname]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotifOpen]);

  const unreadNotifications = notifications.filter((n) => !readIds.has(n.id));
  const displayedNotifications = notifTab === 'unread' ? unreadNotifications : notifications;

  const handleMarkAsRead = (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    persistReadIds(next);
  };

  const handleMarkAllAsRead = () => {
    const next = new Set(readIds);
    notifications.forEach((n) => next.add(n.id));
    persistReadIds(next);
  };

  const handleNotificationClick = (notif: PortalNotification) => {
    handleMarkAsRead(notif.id);
    setIsNotifOpen(false);
    if (notif.href && notif.href !== pathname) {
      router.push(notif.href);
    }
  };

  const getCategoryIcon = (cat: PortalNotification['category']) => {
    switch (cat) {
      case 'HR':
        return { icon: 'ph-bold ph-calendar-check', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'ADMISSIONS':
        return { icon: 'ph-bold ph-user-plus', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'ACADEMIC':
        return { icon: 'ph-bold ph-book-open-text', bg: 'bg-brand-violetLight text-brand-violet border-brand-violet/20' };
      case 'FINANCE':
        return { icon: 'ph-bold ph-currency-circle-dollar', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'BROADCAST':
      default:
        return { icon: 'ph-bold ph-megaphone', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-30 shrink-0">
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

        {/* Live Role-Aware Notification Center */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              const nextOpen = !isNotifOpen;
              setIsNotifOpen(nextOpen);
              if (nextOpen) fetchNotifications();
            }}
            aria-label="Open notifications"
            className={`relative p-2.5 rounded-full transition-colors cursor-pointer outline-none focus:outline-none ${
              isNotifOpen
                ? 'bg-brand-violetLight text-brand-violet'
                : 'text-gray-500 hover:text-brand-violet hover:bg-gray-50'
            }`}
          >
            <i className="ph ph-bell text-xl block"></i>
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand-violet text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center leading-none">
                {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Notification Popover Drawer */}
          {isNotifOpen && (
            <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto mt-2.5 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-sm font-serif font-bold text-brand-textMain leading-tight">
                    Notifications
                  </h3>
                  <p className="text-[11px] text-gray-400 font-semibold">
                    {unreadNotifications.length > 0
                      ? `${unreadNotifications.length} unread alert${unreadNotifications.length === 1 ? '' : 's'}`
                      : 'All caught up'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchNotifications()}
                    title="Refresh notifications"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-brand-violet hover:bg-white transition-colors"
                  >
                    <i className={`ph-bold ph-arrows-clockwise text-xs ${loadingNotifs ? 'animate-spin' : ''}`}></i>
                  </button>
                  {unreadNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-bold text-brand-violet hover:underline px-2 py-1 rounded-lg hover:bg-brand-violetLight/50 transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="px-5 py-2 border-b border-gray-100 flex items-center gap-2 bg-white">
                <button
                  type="button"
                  onClick={() => setNotifTab('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    notifTab === 'all'
                      ? 'bg-brand-violetLight text-brand-violet'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNotifTab('unread')}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    notifTab === 'unread'
                      ? 'bg-brand-violetLight text-brand-violet'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Unread ({unreadNotifications.length})
                </button>
              </div>

              {/* Notification Items List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {loadingNotifs && notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 border-2 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs font-semibold text-gray-400">Checking live updates...</p>
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="py-12 px-6 text-center">
                    <div className="w-11 h-11 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <i className="ph-bold ph-bell-slash text-xl"></i>
                    </div>
                    <p className="text-xs font-bold text-brand-textMain">
                      {notifTab === 'unread' ? 'No Unread Notifications' : 'No Active Notifications'}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {notifTab === 'unread'
                        ? 'You have reviewed all current alerts.'
                        : 'New leave requests, admissions, and academic updates will appear here automatically.'}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((notif) => {
                    const isUnread = !readIds.has(notif.id);
                    const badgeStyle = getCategoryIcon(notif.category);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 flex items-start gap-3.5 cursor-pointer transition-colors ${
                          isUnread ? 'bg-brand-violet/[0.03] hover:bg-brand-violet/[0.06]' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${badgeStyle.bg}`}>
                          <i className={`${badgeStyle.icon} text-base`}></i>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-xs leading-snug ${isUnread ? 'font-bold text-brand-textMain' : 'font-semibold text-gray-700'}`}>
                              {notif.title}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-brand-violet shrink-0 mt-1"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">
                            {notif.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {notif.category} • {notif.timestamp}
                            </span>
                            <span className="text-[10px] font-bold text-brand-violet">
                              Open →
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
