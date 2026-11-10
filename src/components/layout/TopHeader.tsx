"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AuthService, RoselandUser } from '@/lib/auth';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

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

  // Account Dropdown & My Account Modal State
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'profile' | 'security'>('profile');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

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
              href: '/headmaster/inspections',
            });
          });
        }

        // 4. Recent Broadcasts
        if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
          logsRes.value.slice(0, 4).forEach((lg: any) => {
            items.push({
              id: `bc-log-${lg.id}`,
              title: lg.title ? `Broadcast: ${lg.title}` : `SMS Dispatch (${lg.status || 'SENT'})`,
              description: `${lg.message || ''} • Target: ${lg.targetGroup || lg.recipient || 'School Cohort'}`,
              category: 'BROADCAST',
              severity: 'info',
              timestamp: lg.timestamp ? new Date(lg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
              href: '/admin/communications',
            });
          });
        }
      } else if (role === 'TEACHER') {
        const teacherName = (user.fullName || '').toLowerCase();
        const [leaveRes, schemesRes, allocRes, logsRes] = await Promise.allSettled([
          RoselandApi.hr.getLeave(),
          RoselandApi.academic.getLessonSchemes({ teacher_name: user.fullName }),
          RoselandApi.academic.getTeacherAllocation(user.email || user.username || user.id),
          RoselandApi.notify.getLogs(),
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

        // 4. Faculty & Staff Broadcasts
        if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
          logsRes.value
            .filter((lg: any) => {
              const tg = String(lg.targetGroup || lg.recipient || '').toUpperCase();
              return tg.includes('FACULTY') || tg.includes('STAFF') || tg.includes('WHOLE SCHOOL');
            })
            .slice(0, 3)
            .forEach((lg: any) => {
              items.push({
                id: `staff-bc-${lg.id}`,
                title: lg.title || 'Staff Circular',
                description: lg.message || '',
                category: 'BROADCAST',
                severity: 'info',
                timestamp: lg.timestamp ? new Date(lg.timestamp).toLocaleDateString() : 'Circular',
                href: '/teacher',
              });
            });
        }
      } else if (role === 'BURSAR') {
        const [invRes, txRes, leaveRes, logsRes] = await Promise.allSettled([
          RoselandApi.finance.getInvoices(),
          RoselandApi.finance.getTransactions(),
          RoselandApi.hr.getLeave(),
          RoselandApi.notify.getLogs(),
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
              href: '/admin/finance',
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
              href: '/admin/finance',
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
              href: '/admin/hr',
            });
          });
        }

        if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
          logsRes.value
            .filter((lg: any) => {
              const tg = String(lg.targetGroup || lg.recipient || '').toUpperCase();
              return tg.includes('FACULTY') || tg.includes('STAFF');
            })
            .slice(0, 2)
            .forEach((lg: any) => {
              items.push({
                id: `bursar-bc-${lg.id}`,
                title: lg.title || 'Staff Circular',
                description: lg.message || '',
                category: 'BROADCAST',
                severity: 'info',
                timestamp: lg.timestamp ? new Date(lg.timestamp).toLocaleDateString() : 'Circular',
                href: '/admin/finance',
              });
            });
        }
      } else if (role === 'PARENT') {
        const [stuRes, invRes, logsRes] = await Promise.allSettled([
          RoselandApi.sis.getStudents(),
          RoselandApi.finance.getInvoices(),
          RoselandApi.notify.getLogs(),
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

        let hasAnyArrears = false;
        const myWardGrades = new Set<string>();

        myWards.forEach((w: any) => {
          const sIdx = w.index_no || w.index_number || w.id;
          const wName = w.full_name || `${w.first_name || ''} ${w.last_name || ''}`.trim();
          const gradeUpper = String(w.class_grade || '').toUpperCase();
          if (gradeUpper) myWardGrades.add(gradeUpper);

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
          if (wardInvoices.length > 0 || String(w.fee_status || '').toUpperCase() === 'OWING') {
            hasAnyArrears = true;
          }
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

        // Surface School Broadcasts matching the parent's ward cohort
        if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
          logsRes.value
            .filter((lg: any) => {
              const tg = String(lg.targetGroup || lg.recipient || '').toUpperCase();
              if (tg.includes('FACULTY') || tg.includes('STAFF')) return false;
              if (tg.includes('ALL PARENTS') || tg.includes('WHOLE SCHOOL')) return true;
              if (tg.includes('DEFAULTER') || tg.includes('DEBTOR')) return hasAnyArrears;
              for (const g of myWardGrades) {
                if (tg.includes(g)) return true;
                if (tg.includes('EARLY YEARS') && (g.includes('CRECHE') || g.includes('NURSERY') || g.includes('KG'))) return true;
                if (tg.includes('PRIMARY') && /BASIC [1-6]/.test(g)) return true;
                if (tg.includes('JHS') && /BASIC [7-9]/.test(g)) return true;
                if (tg.includes('BECE') && g.includes('BASIC 9')) return true;
              }
              return false;
            })
            .slice(0, 4)
            .forEach((lg: any) => {
              items.push({
                id: `parent-bc-${lg.id}`,
                title: lg.title || 'School Announcement',
                description: lg.message || '',
                category: 'BROADCAST',
                severity: 'info',
                timestamp: lg.timestamp ? new Date(lg.timestamp).toLocaleDateString() : 'Notice',
                href: '/parent',
              });
            });
        }
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
    setCurrentUser(AuthService.getCurrentUser());
    const handlePermsSync = () => {
      setCurrentUser(AuthService.getCurrentUser());
    };
    window.addEventListener('roseland:permissions-updated', handlePermsSync);
    return () => window.removeEventListener('roseland:permissions-updated', handlePermsSync);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotifOpen(false);
        setIsAccountOpen(false);
      }
    };
    if (isNotifOpen || isAccountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotifOpen, isAccountOpen]);

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter your current and new password.');
      return;
    }
    if (newPassword.trim().length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation do not match.');
      return;
    }
    const identifier = currentUser?.email || currentUser?.username || '';
    if (!identifier) {
      toast.error('Could not identify your account. Please sign in again.');
      return;
    }
    setIsChangingPwd(true);
    try {
      await RoselandApi.auth.changePassword({
        identifier,
        currentPassword,
        newPassword: newPassword.trim(),
      });
      toast.success('Your password has been updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsAccountModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const userInitials = (currentUser?.fullName || currentUser?.username || 'RP')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const displayRoleLabel =
    currentUser?.role === 'ADMIN'
      ? 'System Administrator'
      : currentUser?.role === 'HEADMASTER' || currentUser?.role === 'SUPER_ADMIN'
      ? currentUser?.assignedClass
        ? `Headmaster • ${currentUser.assignedClass}`
        : 'Headmaster & School Leader'
      : currentUser?.assignedClass
      ? `${currentUser.assignedClass} Form Master`
      : currentUser?.role
      ? currentUser.role.replace(/_/g, ' ')
      : 'Staff Member';

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
              setIsAccountOpen(false);
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

        {/* Account Menu Icon Button & Dropdown */}
        <div className="relative" ref={accountDropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsAccountOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="Open account menu"
            className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-full border transition-colors cursor-pointer outline-none focus:outline-none ${
              isAccountOpen
                ? 'bg-brand-violetLight border-brand-violet/30 text-brand-violet'
                : 'bg-gray-50/80 hover:bg-gray-100 border-gray-200/70 text-brand-textMain'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-brand-violet/15 text-brand-violet font-serif font-bold text-xs flex items-center justify-center">
              {userInitials || 'RP'}
            </div>
            <span className="hidden sm:inline text-xs font-bold truncate max-w-[110px]">
              {currentUser?.fullName?.split(' ')[0] || 'Account'}
            </span>
            <i className={`ph-bold ph-caret-down text-[11px] text-gray-400 transition-transform ${isAccountOpen ? 'rotate-180 text-brand-violet' : ''}`}></i>
          </button>

          {/* Account Dropdown Menu */}
          {isAccountOpen && (
            <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto mt-2.5 sm:w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
              {/* Identity Header */}
              <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-brand-violetLight text-brand-violet font-serif font-bold text-sm flex items-center justify-center border border-brand-violet/20 shrink-0">
                  {userInitials || 'RP'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand-textMain truncate">
                    {currentUser?.fullName || 'Institutional User'}
                  </p>
                  <p className="text-[11px] font-semibold text-brand-violet truncate">
                    {displayRoleLabel}
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
                    {currentUser?.email || currentUser?.username || ''}
                  </p>
                </div>
              </div>

              {/* Menu Options */}
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen(false);
                    setAccountModalTab('profile');
                    setIsAccountModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-brand-textMain hover:bg-brand-violetLight/50 hover:text-brand-violet transition-colors text-left cursor-pointer"
                >
                  <i className="ph-bold ph-user-circle-gear text-base text-brand-violet"></i>
                  <div>
                    <span className="block font-bold">My Account & Profile</span>
                    <span className="text-[10px] text-gray-400 block">View identity, role & permissions</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen(false);
                    setAccountModalTab('security');
                    setIsAccountModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-brand-textMain hover:bg-brand-violetLight/50 hover:text-brand-violet transition-colors text-left cursor-pointer"
                >
                  <i className="ph-bold ph-key text-base text-brand-violet"></i>
                  <div>
                    <span className="block font-bold">Change Password</span>
                    <span className="text-[10px] text-gray-400 block">Update your login credentials</span>
                  </div>
                </button>

                <Link
                  href="/"
                  onClick={() => setIsAccountOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-brand-textMain hover:bg-gray-100 transition-colors"
                >
                  <i className="ph-bold ph-globe text-base text-gray-400"></i>
                  <div>
                    <span className="block font-bold">Public School Website</span>
                    <span className="text-[10px] text-gray-400 block">Return to roselandprep.edu.gh</span>
                  </div>
                </Link>
              </div>

              {/* Sign Out Footer */}
              <div className="p-2 border-t border-gray-100 bg-gray-50/40">
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen(false);
                    AuthService.logout('/login');
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <i className="ph-bold ph-sign-out text-base"></i>
                    Sign Out
                  </span>
                  <span className="text-[10px] font-mono text-rose-400">End Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Account & Security Full-Viewport Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="My Account & Security"
        subtitle={`${currentUser?.fullName || 'Account'} • ${displayRoleLabel}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Modal Navigation Tabs */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setAccountModalTab('profile')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                accountModalTab === 'profile'
                  ? 'bg-white text-brand-violet shadow-xs'
                  : 'text-gray-500 hover:text-brand-textMain'
              }`}
            >
              <i className="ph-bold ph-identification-card text-sm"></i>
              Profile & Role Details
            </button>
            <button
              type="button"
              onClick={() => setAccountModalTab('security')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                accountModalTab === 'security'
                  ? 'bg-white text-brand-violet shadow-xs'
                  : 'text-gray-500 hover:text-brand-textMain'
              }`}
            >
              <i className="ph-bold ph-lock-key text-sm"></i>
              Password & Security
            </button>
          </div>

          {accountModalTab === 'profile' ? (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-violetLight text-brand-violet font-serif font-bold text-lg flex items-center justify-center border border-brand-violet/20 shrink-0">
                  {userInitials || 'RP'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-serif font-bold text-base text-brand-textMain truncate">
                    {currentUser?.fullName || 'Institutional User'}
                  </h4>
                  <p className="text-xs font-bold text-brand-violet">{displayRoleLabel}</p>
                  <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                    ID: {currentUser?.username || currentUser?.email || 'Verified'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  Active Session
                </span>
              </div>

              {/* Account Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl border border-gray-100 bg-white">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Email / Login Identifier
                  </span>
                  <strong className="font-mono text-brand-textMain break-all">
                    {currentUser?.email || currentUser?.username || 'Not set'}
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl border border-gray-100 bg-white">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Primary Role
                  </span>
                  <strong className="text-brand-textMain">
                    {currentUser?.role || 'STAFF'}
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl border border-gray-100 bg-white">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Assigned Class / Scope
                  </span>
                  <strong className="text-brand-textMain">
                    {currentUser?.assignedClass || 'Whole-School / Departmental'}
                  </strong>
                </div>

                <div className="p-3.5 rounded-2xl border border-gray-100 bg-white">
                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                    Phone Contact
                  </span>
                  <strong className="font-mono text-brand-textMain">
                    {currentUser?.phone || '+233 (Institutional Contact)'}
                  </strong>
                </div>
              </div>

              {/* Active Role Capabilities */}
              {Array.isArray(currentUser?.permissions) && currentUser.permissions.length > 0 && (
                <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Granted Portal Capabilities ({currentUser.permissions.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentUser.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-[11px] font-semibold text-gray-700"
                      >
                        ✓ {perm.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAccountModalTab('security')}
                  className="px-4 py-2.5 rounded-xl bg-brand-violetLight text-brand-violet text-xs font-bold hover:bg-brand-violet hover:text-white transition-colors"
                >
                  Change My Password →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountModalOpen(false);
                    AuthService.logout('/login');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangeOwnPassword} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-brand-violetLight/50 border border-brand-violet/15 text-xs text-brand-textMain">
                Your password is encrypted with <strong>bcrypt</strong> before storage. Choose a strong password of at least 6 characters.
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
                  placeholder="Enter your current password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  New Password (min. 6 characters)
                </label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
                  placeholder="Enter new password"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Confirm New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
                  placeholder="Re-enter new password"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="rounded border-gray-300 text-brand-violet focus:ring-brand-violet"
                />
                Show passwords
              </label>

              <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-violet hover:bg-brand-violetDark text-white shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPwd ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </header>
  );
}
