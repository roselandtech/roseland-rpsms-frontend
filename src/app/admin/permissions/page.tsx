"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { RoselandApi } from '@/lib/api';
import { executiveNavGroups, filterNavGroupsByPermissions } from '@/lib/executiveNav';

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
              disabled={savingRole === activeRoleRecord?.role}
              className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
            >
              <i className="ph-bold ph-floppy-disk text-sm"></i>
              {savingRole === activeRoleRecord?.role ? 'Saving...' : `Save ${activeRoleRecord?.role} Permissions`}
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

      {/* Staff Role Assignment Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-brand-textMain">
              Staff Accounts &amp; Role Assignments
            </h2>
            <p className="text-xs text-brand-textMuted mt-0.5">
              Switch any staff account between <strong>HEADMASTER</strong>, <strong>TEACHER</strong>, <strong>BURSAR</strong>, or <strong>ADMIN</strong>, or click <strong>Allocate Workload</strong> to assign classes and subjects (including for the Headmaster).
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
                <th className="py-3.5 px-4">Assigned Form Class</th>
                <th className="py-3.5 px-4">Institutional Role</th>
                <th className="py-3.5 px-6 text-right">Teaching Workload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : staffList.map((st) => {
                const effectiveRole = st.role === 'SUPER_ADMIN' ? 'HEADMASTER' : st.role;
                return (
                  <tr key={st.id} className="hover:bg-gray-50/70">
                    <td className="py-3.5 px-6 font-bold text-brand-textMain">{st.fullName}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      {st.email} <span className="text-gray-400">({st.username})</span>
                    </td>
                    <td className="py-3.5 px-4">
                      {st.assignedClass ? (
                        <span className="font-bold text-brand-violet bg-brand-violetLight/30 px-2.5 py-1 rounded-lg">
                          {st.assignedClass}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">None assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={effectiveRole}
                        disabled={updatingStaffId === st.id}
                        onChange={(e) => handleChangeStaffRole(st.id, e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet cursor-pointer"
                      >
                        <option value="HEADMASTER">HEADMASTER (School Leader)</option>
                        <option value="TEACHER">TEACHER (Faculty)</option>
                        <option value="BURSAR">BURSAR (Finance)</option>
                        <option value="ADMIN">ADMIN (System RBAC)</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(st);
                            setResetNewPwd('Roseland2026!');
                          }}
                          className="px-3 py-1.5 border border-gray-200 text-gray-600 hover:border-brand-violet hover:text-brand-violet rounded-xl font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <i className="ph-bold ph-key"></i>
                          Reset Password
                        </button>
                        <Link
                          href="/admin/staff"
                          className="px-3 py-1.5 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet hover:text-white rounded-xl font-bold transition-all inline-flex items-center gap-1"
                        >
                          <i className="ph-bold ph-chalkboard-simple"></i>
                          Assign Class / Subjects
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
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-bg/50">
              <div>
                <h3 className="text-lg font-serif font-bold text-brand-textMain">Reset Staff Password</h3>
                <p className="text-xs text-brand-textMuted mt-0.5">{resetTarget.fullName} ({resetTarget.email})</p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <i className="ph-bold ph-x text-sm"></i>
              </button>
            </div>
            <form onSubmit={handleResetStaffPassword} className="p-6 space-y-4">
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
          </div>
        </div>
      )}
    </div>
  );
}
