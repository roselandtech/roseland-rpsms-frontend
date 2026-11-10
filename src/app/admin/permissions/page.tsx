"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import { executiveNavGroups, filterNavGroupsByPermissions } from '@/lib/executiveNav';
import Modal from '@/components/ui/Modal';

interface RolePermissionRecord {
  role: string;
  label: string;
  description: string;
  permissions: string[];
  updatedAt?: string;
}

const CAPABILITY_CATALOG = [
  {
    key: 'can_teach',
    title: 'Classroom Teaching & Grading (My Teaching Desk)',
    description: 'Grants access to Classroom Cockpit, Class Roster, Daily Attendance, GES Lesson Studio, Dynamic CA Tracker, and SBA Gradebook.',
    icon: 'ph-chalkboard-teacher',
  },
  {
    key: 'view_executive',
    title: 'Headmaster & Executive Cockpit',
    description: 'Access to institutional KPIs, teacher lesson plan inspections, report card sign-offs, and BECE analytics.',
    icon: 'ph-gauge',
  },
  {
    key: 'manage_academics',
    title: 'Timetable, Class Streams & Curriculum',
    description: 'Create/edit SIS class streams, assign Form Masters, map GES subjects, and manage the master timetable.',
    icon: 'ph-books',
  },
  {
    key: 'manage_admissions',
    title: 'Admissions & Enrollment Pipeline',
    description: 'Review online admission applications, record entrance scores, and approve new student enrollments.',
    icon: 'ph-user-plus',
  },
  {
    key: 'manage_students',
    title: 'Student & Parent Registry (SIS)',
    description: 'View and update student dossiers, parent contacts, pastoral care, and batch promotions.',
    icon: 'ph-student',
  },
  {
    key: 'manage_staff',
    title: 'Faculty Directory & Workload Allocation',
    description: 'Onboard staff accounts and allocate Form Classes, teaching classes, and GES subjects.',
    icon: 'ph-users-three',
  },
  {
    key: 'manage_finance',
    title: 'Fee Ledger, Billing & Bursary',
    description: 'Generate tuition invoices, record fee payments, issue official receipts, and view financial summaries.',
    icon: 'ph-wallet',
  },
  {
    key: 'manage_communications',
    title: 'Broadcasts & Parent SMS Hub',
    description: 'Dispatch institutional SMS announcements and emergency broadcasts to parents and staff.',
    icon: 'ph-broadcast',
  },
  {
    key: 'manage_cbt',
    title: 'CBT Examination Center',
    description: 'Create computer-based tests and monitor live examination proctoring nodes.',
    icon: 'ph-laptop',
  },
  {
    key: 'manage_settings',
    title: 'Institutional Settings & Security Audit',
    description: 'Configure school profile, academic calendar terms, and system security settings.',
    icon: 'ph-gear',
  },
  {
    key: 'manage_permissions',
    title: 'System Role & Permission Administration',
    description: 'Modify this RBAC permission matrix and reassign staff institutional roles.',
    icon: 'ph-shield-check',
  },
];

const DEFAULT_ROLES: RolePermissionRecord[] = [
  {
    role: 'ADMIN',
    label: 'System Administrator',
    description: 'Configures role permissions, provisions staff accounts, and manages institutional security & settings.',
    permissions: ['manage_permissions', 'manage_staff', 'manage_settings', 'view_executive', 'manage_academics', 'manage_admissions', 'manage_students', 'manage_finance', 'manage_communications', 'manage_cbt'],
  },
  {
    role: 'HEADMASTER',
    label: 'Headmaster & School Leader',
    description: 'Oversees academic performance, approvals, inspections, staff, and can also teach assigned classes.',
    permissions: ['view_executive', 'manage_academics', 'manage_admissions', 'manage_students', 'manage_staff', 'can_teach', 'manage_communications', 'manage_cbt'],
  },
  {
    role: 'TEACHER',
    label: 'Classroom & Subject Teacher',
    description: 'Manages assigned class rosters, daily attendance, GES lesson plans, CA tracker, and SBA gradebook.',
    permissions: ['can_teach', 'manage_cbt'],
  },
  {
    role: 'BURSAR',
    label: 'School Bursar & Finance Officer',
    description: 'Manages tuition billing, fee collection, receipts, and payroll.',
    permissions: ['manage_finance', 'manage_students'],
  },
];

export default function AdminPermissionsPage() {
  const [roles, setRoles] = useState<RolePermissionRecord[]>(DEFAULT_ROLES);
  const [selectedRole, setSelectedRole] = useState<string>('HEADMASTER');
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [updatingStaffId, setUpdatingStaffId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<any | null>(null);
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [isResettingPwd, setIsResettingPwd] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(AuthService.getCurrentUser());
  }, []);

  const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [permsRes, staffRes] = await Promise.allSettled([
        RoselandApi.auth.getRolePermissions(),
        RoselandApi.auth.getStaffDirectory(),
      ]);

      if (permsRes.status === 'fulfilled' && Array.isArray(permsRes.value) && permsRes.value.length > 0) {
        setRoles(permsRes.value);
      }
      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaffList(staffRes.value);
      }
    } catch (err) {
      console.error('Failed to load RBAC matrix:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeRoleRecord = roles.find((r) => r.role === selectedRole) || roles[0];
  const previewNavGroups = activeRoleRecord
    ? filterNavGroupsByPermissions(executiveNavGroups, activeRoleRecord.role, activeRoleRecord.permissions)
    : [];

  const handleTogglePermission = (permKey: string) => {
    if (!activeRoleRecord) return;
    if (activeRoleRecord.role === 'ADMIN' && !isCurrentUserAdmin) {
      toast.error('Security Policy: Only verified System Administrators can modify Admin role capabilities.');
      return;
    }
    const exists = activeRoleRecord.permissions.includes(permKey);
    const nextPerms = exists
      ? activeRoleRecord.permissions.filter((p) => p !== permKey)
      : [...activeRoleRecord.permissions, permKey];

    setRoles((prev) =>
      prev.map((r) => (r.role === activeRoleRecord.role ? { ...r, permissions: nextPerms } : r))
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('roseland:permissions-updated', {
          detail: { role: activeRoleRecord.role, permissions: nextPerms },
        })
      );
    }
  };

  const handleSaveRolePermissions = async () => {
    if (!activeRoleRecord) return;
    if (activeRoleRecord.role === 'ADMIN' && !isCurrentUserAdmin) {
      toast.error('Security Policy: Only verified System Administrators can modify Admin role capabilities.');
      return;
    }
    setSavingRole(activeRoleRecord.role);
    try {
      await RoselandApi.auth.updateRolePermissions(activeRoleRecord.role, activeRoleRecord.permissions);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('roseland:permissions-updated', {
            detail: { role: activeRoleRecord.role, permissions: activeRoleRecord.permissions },
          })
        );
      }
      toast.success(`Permissions updated for ${activeRoleRecord.label} (${activeRoleRecord.role})!`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not save role permissions');
    } finally {
      setSavingRole(null);
    }
  };

  const handleChangeStaffRole = async (staffId: string, newRole: string) => {
    if (newRole === 'ADMIN' && !isCurrentUserAdmin) {
      toast.error('Security Policy: Only verified System Administrators can assign the System Admin role.');
      return;
    }
    const staff = staffList.find((s) => s.id === staffId);
    if ((staff?.role === 'ADMIN' || staff?.role === 'SUPER_ADMIN') && !isCurrentUserAdmin) {
      toast.error('Security Policy: Only verified System Administrators can alter Admin accounts.');
      return;
    }
    setUpdatingStaffId(staffId);
    try {
      await RoselandApi.auth.updateStaffAllocation(staffId, { role: newRole });
      setStaffList((prev) => prev.map((s) => (s.id === staffId ? { ...s, role: newRole } : s)));
      toast.success(`Updated staff role to ${newRole}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not update staff role');
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleToggleStaffPortalAccess = async (staffId: string, currentActive: boolean) => {
    setUpdatingStaffId(staffId);
    const nextActive = !currentActive;
    try {
      const staff = staffList.find((s) => s.id === staffId);
      const defaultPortal = staff?.portalAccess && staff.portalAccess !== 'DISABLED'
        ? staff.portalAccess
        : (staff?.role === 'TEACHER' ? '/teacher' : staff?.role === 'HEADMASTER' ? '/headmaster' : staff?.role === 'BURSAR' ? '/admin/finance' : '/admin/permissions');

      await RoselandApi.auth.updateStaffPortalAccess(staffId, {
        isActive: nextActive,
        portalAccess: nextActive ? defaultPortal : 'DISABLED'
      });

      setStaffList((prev) => prev.map((s) => (s.id === staffId ? {
        ...s,
        isActive: nextActive,
        portalAccess: nextActive ? defaultPortal : 'DISABLED'
      } : s)));

      toast.success(nextActive ? 'Portal login access enabled for staff member' : 'Portal access suspended for staff member (Login blocked)');
    } catch (err: any) {
      toast.error(err?.message || 'Could not update portal access status');
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleChangeStaffPortalRoute = async (staffId: string, newPortal: string) => {
    setUpdatingStaffId(staffId);
    try {
      await RoselandApi.auth.updateStaffPortalAccess(staffId, { portalAccess: newPortal });
      setStaffList((prev) => prev.map((s) => (s.id === staffId ? { ...s, portalAccess: newPortal } : s)));
      toast.success(`Updated default portal route to ${newPortal}`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not update portal route');
    } finally {
      setUpdatingStaffId(null);
    }
  };

  const handleResetStaffPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || !resetNewPwd) return;
    if (resetNewPwd.trim().length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    setIsResettingPwd(true);
    try {
      await RoselandApi.auth.resetStaffPassword(resetTarget.id, resetNewPwd.trim());
      toast.success(`Password reset for ${resetTarget.fullName}!`);
      setResetTarget(null);
      setResetNewPwd('');
    } catch (err: any) {
      toast.error(err?.message || 'Could not reset password');
    } finally {
      setIsResettingPwd(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            System Administration • Role-Based Access Control (RBAC)
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Roles & Permissions Governance
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1 max-w-2xl">
            Assign capabilities to each institutional role (such as enabling <strong>Classroom Teaching &amp; Grading</strong> for the <strong>Headmaster</strong>) and manage staff role assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/staff"
            className="px-5 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-all inline-flex items-center gap-2"
          >
            <i className="ph-bold ph-chalkboard-teacher"></i>
            Allocate Classes &amp; Subjects
          </Link>
        </div>
      </div>

      {/* Role Selector & Capability Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Role Cards */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            1. Select Institutional Role
          </h2>
          {roles.map((r) => {
            const isSelected = r.role === selectedRole;
            const staffCount = staffList.filter((s) => (s.role === 'SUPER_ADMIN' ? 'HEADMASTER' : s.role) === r.role).length;
            return (
              <button
                key={r.role}
                onClick={() => setSelectedRole(r.role)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-brand-violet bg-white shadow-md'
                    : 'border-gray-100 bg-white/70 hover:bg-white hover:border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md ${
                    r.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                    r.role === 'HEADMASTER' ? 'bg-amber-100 text-amber-800' :
                    r.role === 'BURSAR' ? 'bg-blue-100 text-blue-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {r.role}
                  </span>
                  <span className="text-[11px] font-bold text-gray-400">
                    {staffCount} {staffCount === 1 ? 'Account' : 'Accounts'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-brand-textMain">{r.label}</h3>
                <p className="text-xs text-brand-textMuted mt-1 leading-relaxed">{r.description}</p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-brand-violet">
                  <span>{r.permissions.length} Capabilities Active</span>
                  <i className="ph-bold ph-caret-right"></i>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Capabilities Checklist for Selected Role */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-bg/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-violet">
                  Configuring Role:
                </span>
                <span className="text-sm font-extrabold bg-brand-violet text-white px-2.5 py-0.5 rounded-lg">
                  {activeRoleRecord?.role}
                </span>
              </div>
              <h3 className="text-lg font-serif font-bold text-brand-textMain mt-1">
                {activeRoleRecord?.label} Permissions
              </h3>
            </div>
            <button
              onClick={handleSaveRolePermissions}
              disabled={savingRole === activeRoleRecord?.role || (activeRoleRecord?.role === 'ADMIN' && !isCurrentUserAdmin)}
              className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
            >
              <i className="ph-bold ph-floppy-disk text-sm"></i>
              {savingRole === activeRoleRecord?.role
                ? 'Saving...'
                : (activeRoleRecord?.role === 'ADMIN' && !isCurrentUserAdmin)
                  ? 'Admin Only (Protected)'
                  : `Save ${activeRoleRecord?.role} Permissions`}
            </button>
          </div>

          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {CAPABILITY_CATALOG.map((cap) => {
              const enabled = activeRoleRecord?.permissions.includes(cap.key);
              return (
                <div
                  key={cap.key}
                  onClick={() => handleTogglePermission(cap.key)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                    enabled
                      ? 'border-brand-violet bg-brand-violetLight/10'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    enabled ? 'bg-brand-violet text-white' : 'border-2 border-gray-300 bg-white'
                  }`}>
                    {enabled && <i className="ph-bold ph-check text-xs"></i>}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <i className={`ph-bold ${cap.icon} ${enabled ? 'text-brand-violet' : 'text-gray-400'} text-sm`}></i>
                      <h4 className={`text-xs font-bold ${enabled ? 'text-brand-violet' : 'text-brand-textMain'}`}>
                        {cap.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-brand-textMuted mt-1 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Portal Sidebar Preview for Selected Role */}
          <div className="px-6 pb-6 pt-2 border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center justify-between mb-3 pt-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-violet">
                  Live Portal Sidebar Preview ({activeRoleRecord?.role})
                </span>
                <p className="text-xs text-brand-textMuted">
                  Only the sidebar sections and menu links below will appear when a <strong>{activeRoleRecord?.role}</strong> logs in:
                </p>
              </div>
              <span className="text-xs font-bold bg-white border border-gray-200 px-3 py-1 rounded-lg text-brand-textMain">
                {previewNavGroups.reduce((acc, g) => acc + g.items.length, 0)} Menu Links Visible
              </span>
            </div>

            {previewNavGroups.length === 0 ? (
              <div className="p-4 rounded-xl bg-white border border-dashed border-gray-200 text-xs text-gray-400 text-center">
                No portal sidebar modules enabled for this role. Select at least one capability above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {previewNavGroups.map((group) => (
                  <div key={group.title} className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-2xs">
                    <h5 className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 mb-2">
                      {group.title}
                    </h5>
                    <ul className="space-y-1.5">
                      {group.items.map((item) => (
                        <li key={item.href} className="flex items-center gap-2 text-xs font-semibold text-brand-textMain">
                          <i className={`${item.icon} text-brand-violet text-sm shrink-0`}></i>
                          <span className="truncate">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Institutional Portals Switchboard */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-violet block">
              Institutional Gateway Architecture
            </span>
            <h2 className="text-lg font-serif font-bold text-brand-textMain">
              Portals &amp; Role Access Switchboard
            </h2>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-brand-bg px-3 py-1 rounded-xl border border-gray-200">
            5 Institutional Portals Configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            {
              title: 'Teacher Portal',
              route: '/teacher',
              role: 'TEACHER',
              icon: 'ph-chalkboard-teacher',
              color: 'emerald',
              description: 'Cockpit, Schemes, Gradebook & CA Tracker',
              count: staffList.filter((s) => (s.role === 'TEACHER') && s.isActive !== false).length,
            },
            {
              title: 'Executive Cockpit',
              route: '/headmaster',
              role: 'HEADMASTER',
              icon: 'ph-student',
              color: 'amber',
              description: 'Live Classrooms, Appraisals & Inspections',
              count: staffList.filter((s) => (s.role === 'HEADMASTER' || s.role === 'SUPER_ADMIN') && s.isActive !== false).length,
            },
            {
              title: 'Bursar & Accounts',
              route: '/admin/finance',
              role: 'BURSAR',
              icon: 'ph-wallet',
              color: 'blue',
              description: 'Tuition Invoices, MoMo & Fee Ledger',
              count: staffList.filter((s) => (s.role === 'BURSAR') && s.isActive !== false).length,
            },
            {
              title: 'System RBAC Admin',
              route: '/admin/permissions',
              role: 'ADMIN',
              icon: 'ph-shield-check',
              color: 'purple',
              description: 'Portal Governance, Staff Accounts & Security',
              count: staffList.filter((s) => (s.role === 'ADMIN') && s.isActive !== false).length,
            },
            {
              title: 'CBT Examination',
              route: '/cbt',
              role: 'ALL STAFF',
              icon: 'ph-laptop',
              color: 'indigo',
              description: 'Exam Simulator & Proctoring Monitoring',
              count: staffList.filter((s) => s.isActive !== false).length,
            },
          ].map((portal) => (
            <div
              key={portal.route}
              className="p-4 rounded-2xl border border-gray-100 bg-brand-bg/40 hover:bg-white hover:border-brand-violet/30 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-base ${
                    portal.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                    portal.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                    portal.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    portal.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    <i className={`ph-bold ${portal.icon}`}></i>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>ONLINE</span>
                  </span>
                </div>
                <h4 className="text-xs font-bold text-brand-textMain">{portal.title}</h4>
                <p className="font-mono text-[10px] text-brand-violet font-semibold mt-0.5">{portal.route}</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">{portal.description}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                <span className="text-gray-400 font-bold uppercase">{portal.role}</span>
                <span className="font-bold text-brand-textMain">{portal.count} Active Users</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Staff Role Assignment Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-brand-textMain">
              Staff Accounts &amp; Portal Access Management
            </h2>
            <p className="text-xs text-brand-textMuted mt-0.5">
              Control and disable portal logins for individual staff members, switch institutional roles, or adjust their default landing portal.
            </p>
          </div>
          <Link
            href="/admin/staff"
            className="text-xs font-bold text-brand-violet hover:underline inline-flex items-center gap-1"
          >
            Open Full Faculty &amp; Workload Directory <i className="ph-bold ph-arrow-right"></i>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Staff Member</th>
                <th className="py-3.5 px-4">Email / Username</th>
                <th className="py-3.5 px-4">Institutional Role</th>
                <th className="py-3.5 px-4">Landing Portal</th>
                <th className="py-3.5 px-4">Portal Status</th>
                <th className="py-3.5 px-6 text-right">Actions &amp; Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-gray-400">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : staffList.map((st) => {
                const effectiveRole = st.role === 'SUPER_ADMIN' ? 'HEADMASTER' : st.role;
                const isStaffActive = st.isActive !== false;
                const portalRoute = st.portalAccess || (effectiveRole === 'TEACHER' ? '/teacher' : effectiveRole === 'HEADMASTER' ? '/headmaster' : effectiveRole === 'BURSAR' ? '/admin/finance' : '/admin/permissions');
                return (
                  <tr key={st.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-6 font-bold text-brand-textMain">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-violet/10 text-brand-violet flex items-center justify-center font-bold text-xs shrink-0">
                          {st.fullName ? st.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <strong className="block text-brand-textMain">{st.fullName}</strong>
                          {st.assignedClass ? (
                            <span className="text-[10px] text-brand-violet font-semibold">
                              {st.assignedClass} Form Master
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400">General Faculty</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      <div>{st.email}</div>
                      <span className="text-gray-400 text-[10px]">@{st.username}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={effectiveRole}
                        disabled={updatingStaffId === st.id || (!isCurrentUserAdmin && effectiveRole === 'ADMIN')}
                        onChange={(e) => handleChangeStaffRole(st.id, e.target.value)}
                        className={`bg-white border rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none focus:border-brand-violet cursor-pointer ${
                          effectiveRole === 'ADMIN' ? 'text-purple-800 border-purple-200' : 'text-brand-textMain border-gray-200'
                        }`}
                      >
                        <option value="HEADMASTER">HEADMASTER (School Leader)</option>
                        <option value="TEACHER">TEACHER (Faculty)</option>
                        <option value="BURSAR">BURSAR (Finance)</option>
                        {isCurrentUserAdmin && <option value="ADMIN">ADMIN (System RBAC)</option>}
                      </select>
                    </td>

                    <td className="py-3.5 px-4">
                      <select
                        value={portalRoute}
                        disabled={updatingStaffId === st.id}
                        onChange={(e) => handleChangeStaffPortalRoute(st.id, e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-semibold text-brand-violet outline-none focus:border-brand-violet cursor-pointer"
                      >
                        <option value="/teacher">/teacher (Teacher Portal)</option>
                        <option value="/headmaster">/headmaster (Executive Cockpit)</option>
                        <option value="/admin/finance">/admin/finance (Bursary)</option>
                        <option value="/admin/permissions">/admin/permissions (System Admin)</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                        isStaffActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isStaffActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span>{isStaffActive ? 'Active' : 'Suspended'}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        {effectiveRole !== 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleToggleStaffPortalAccess(st.id, isStaffActive)}
                            disabled={updatingStaffId === st.id}
                            title={isStaffActive ? 'Suspend portal login for this user' : 'Restore portal login for this user'}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1 ${
                              isStaffActive
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                            }`}
                          >
                            <i className={`ph-bold ${isStaffActive ? 'ph-prohibit' : 'ph-check-circle'}`}></i>
                            <span>{isStaffActive ? 'Suspend Portal' : 'Activate Portal'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(st);
                            setResetNewPwd('Roseland2026!');
                          }}
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:border-brand-violet hover:text-brand-violet rounded-xl font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <i className="ph-bold ph-key"></i>
                          <span>Reset Pwd</span>
                        </button>
                        <Link
                          href="/admin/staff"
                          className="px-3 py-1.5 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet hover:text-white rounded-xl font-bold transition-all inline-flex items-center gap-1"
                        >
                          <i className="ph-bold ph-identification-card"></i>
                          <span>Dossier</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Reset Staff Password Modal */}
      <Modal
        isOpen={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset Staff Password"
        subtitle={resetTarget ? `${resetTarget.fullName} (${resetTarget.email})` : ''}
        size="md"
      >
        <form onSubmit={handleResetStaffPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">New Password</label>
            <input
              type="text"
              value={resetNewPwd}
              onChange={(e) => setResetNewPwd(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-violet"
              placeholder="Enter new temporary password"
              required
            />
            <p className="text-[11px] text-brand-textMuted mt-1.5">
              The password will be encrypted using bcrypt (10 salt rounds). The staff member can change it anytime using the key icon in their portal sidebar.
            </p>
          </div>
          <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setResetTarget(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isResettingPwd}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-violet hover:bg-brand-violetDark text-white shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isResettingPwd ? 'Resetting...' : 'Save New Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
