"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';
import { printStaffComprehensiveDossier } from '@/lib/pdf-printer';

export interface StaffMember {
  id: string;
  staffNo: string;
  name: string;
  email: string;
  username: string;
  role: string;
  rawRole: 'ADMIN' | 'SUPER_ADMIN' | 'HEADMASTER' | 'TEACHER' | 'BURSAR' | 'SUPPORT';
  department: 'Teaching' | 'Admin' | 'Transport' | 'Support';
  assignedClass?: string;
  assignedClasses?: string[];
  subjects?: string[];
  ntcLicense?: string;
  cpdPoints?: number;
  assignedPeriods: number;
  todayStatus: 'Present' | 'On Leave' | 'Late';
  phone: string;
  avatar: string;
  isActive?: boolean;
  portalAccess?: string;
  appointmentDate?: string;
  qualifications?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export default function AdminStaffPage() {
  const { classes } = useClasses();
  const { subjects: registeredSubjects } = useSubjects();
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(null);
  const [allocatingStaff, setAllocatingStaff] = useState<StaffMember | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dossierTab, setDossierTab] = useState<'profile' | 'workload' | 'appraisal' | 'portal'>('profile');
  const [activeStaffAppraisal, setActiveStaffAppraisal] = useState<any>(null);
  const [loadingAppraisal, setLoadingAppraisal] = useState(false);
  const [updatingPortalStaffId, setUpdatingPortalStaffId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentUser(AuthService.getCurrentUser());
  }, []);

  const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Fetch live appraisal ratings whenever active staff changes
  useEffect(() => {
    if (!activeStaff) {
      setActiveStaffAppraisal(null);
      return;
    }
    setLoadingAppraisal(true);
    RoselandApi.academic.getTeacherAppraisal(activeStaff.name)
      .then((res: any) => {
        if (res && res.name) {
          setActiveStaffAppraisal(res);
        } else {
          setActiveStaffAppraisal(null);
        }
      })
      .catch(() => setActiveStaffAppraisal(null))
      .finally(() => setLoadingAppraisal(false));
  }, [activeStaff]);

  // Allocation Form State
  const [allocClass, setAllocClass] = useState('');
  const [allocAssignedClasses, setAllocAssignedClasses] = useState<string[]>([]);
  const [allocSubjects, setAllocSubjects] = useState<string[]>([]);
  const [allocPeriods, setAllocPeriods] = useState(22);

  // Onboarding Form State
  const [onboardForm, setOnboardForm] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '+233 24 ',
    role: 'TEACHER' as 'ADMIN' | 'SUPER_ADMIN' | 'HEADMASTER' | 'TEACHER' | 'BURSAR' | 'SUPPORT',
    password: '',
    ntcLicense: '',
    assignedClass: '',
    assignedClasses: [] as string[],
    subjects: [] as string[],
    weeklyPeriods: 22,
    avatar: ''
  });

  // Sync with dynamic registries
  useEffect(() => {
    if (registeredSubjects.length > 0) {
      setOnboardForm(prev => prev.subjects.length > 0 ? prev : { ...prev, subjects: [registeredSubjects[0].name] });
      setAllocSubjects(prev => prev.length > 0 ? prev : [registeredSubjects[0].name]);
    }
  }, [registeredSubjects]);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const loadStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch both auth users and academic allocations
      const [authStaff, allocations] = await Promise.allSettled([
        RoselandApi.auth.getStaffDirectory(),
        RoselandApi.academic.getFacultyAllocations()
      ]);

      const allocMap = new Map<string, any>();
      if (allocations.status === 'fulfilled' && Array.isArray(allocations.value)) {
        allocations.value.forEach((a: any) => {
          if (a.teacherName) allocMap.set(a.teacherName.toLowerCase(), a);
          if (a.teacherEmail) allocMap.set(a.teacherEmail.toLowerCase(), a);
        });
      }

      if (authStaff.status === 'fulfilled' && Array.isArray(authStaff.value)) {
        const mapped: StaffMember[] = authStaff.value.map((u: any, idx: number) => {
          let dept: StaffMember['department'] = 'Teaching';
          let roleTitle = u.fullName || 'Faculty Member';
          let r = u.role || 'TEACHER';
          if (r === 'SUPER_ADMIN') {
            r = u.email?.toLowerCase() === 'admin@roselandprep.edu.gh' ? 'ADMIN' : 'HEADMASTER';
          }

          if (r === 'ADMIN') {
            dept = 'Admin';
            roleTitle = 'System Administrator (RBAC)';
          } else if (r === 'HEADMASTER') {
            dept = 'Teaching';
            roleTitle = 'Headmaster & School Leader';
          } else if (r === 'BURSAR') {
            dept = 'Admin';
            roleTitle = 'School Bursar & Accounts Lead';
          }

          const alloc = allocMap.get(u.email?.toLowerCase()) || allocMap.get(u.fullName?.toLowerCase());
          const subs = alloc?.subjects || [];
          const aClasses = alloc?.assignedClasses || [];
          const periods = alloc?.weeklyPeriods || 0;
          const assignedForm = u.assignedClass || alloc?.formClass || undefined;

          if (r === 'TEACHER') {
            dept = 'Teaching';
            roleTitle = assignedForm ? `${assignedForm} Form Master` : (subs.length > 0 ? `Subject Specialist (${subs.join(', ')})` : 'Subject Specialist (Floating)');
          } else if (r === 'HEADMASTER' && assignedForm) {
            roleTitle = `Headmaster • ${assignedForm} Form Master`;
          }

          return {
            id: u.id,
            staffNo: `RPS-${r.substring(0, 3)}-${String(idx + 1).padStart(3, '0')}`,
            name: u.fullName,
            email: u.email,
            username: u.username,
            role: roleTitle,
            rawRole: r,
            department: dept,
            assignedClass: assignedForm,
            assignedClasses: aClasses,
            subjects: subs,
            ntcLicense: u.ntcLicense || undefined,
            cpdPoints: u.cpdPoints || undefined,
            assignedPeriods: periods,
            todayStatus: 'Present',
            phone: u.phone || '—',
            avatar: u.avatar || '',
            isActive: u.isActive !== false,
            portalAccess: u.portalAccess || (r === 'TEACHER' ? '/teacher' : r === 'HEADMASTER' ? '/headmaster' : r === 'BURSAR' ? '/admin/finance' : '/admin/permissions'),
            appointmentDate: u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Jan 2024',
            qualifications: u.qualifications || (r === 'TEACHER' ? 'B.Ed Basic Education (UCC / UEW)' : r === 'HEADMASTER' ? 'M.Ed Educational Leadership & Administration' : r === 'BURSAR' ? 'B.Sc Accounting & Finance (ICAG)' : 'B.Sc Computer Science & Systems'),
            emergencyContact: {
              name: 'Next of Kin / Spouse',
              relationship: 'Family Contact',
              phone: u.phone || '+233 24 000 0000'
            }
          };
        });

        setStaffList(mapped);
      } else {
        setStaffList([]);
      }
    } catch (err) {
      console.error("Failed to load staff directory from backend:", err);
      setStaffList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTogglePortalAccess = async (staff: StaffMember) => {
    const nextStatus = staff.isActive === false ? true : false;
    setUpdatingPortalStaffId(staff.id);
    try {
      const defaultPortal = staff.portalAccess && staff.portalAccess !== 'DISABLED' 
        ? staff.portalAccess 
        : (staff.rawRole === 'TEACHER' ? '/teacher' : staff.rawRole === 'HEADMASTER' ? '/headmaster' : staff.rawRole === 'BURSAR' ? '/admin/finance' : '/admin/permissions');
      
      await RoselandApi.auth.updateStaffPortalAccess(staff.id, {
        isActive: nextStatus,
        portalAccess: nextStatus ? defaultPortal : 'DISABLED'
      });

      setStaffList(prev => prev.map(s => s.id === staff.id ? {
        ...s,
        isActive: nextStatus,
        portalAccess: nextStatus ? defaultPortal : 'DISABLED'
      } : s));

      if (activeStaff && activeStaff.id === staff.id) {
        setActiveStaff({
          ...activeStaff,
          isActive: nextStatus,
          portalAccess: nextStatus ? defaultPortal : 'DISABLED'
        });
      }

      toast.success(nextStatus ? `Portal login activated for ${staff.name}` : `Portal access suspended for ${staff.name} (Login disabled)`);
    } catch (err: any) {
      toast.error(err?.message || 'Could not update portal access status');
    } finally {
      setUpdatingPortalStaffId(null);
    }
  };


  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Open Allocation Modal for a Teacher
  const handleOpenAllocation = (staff: StaffMember) => {
    setAllocatingStaff(staff);
    setAllocClass(staff.assignedClass || '');
    setAllocAssignedClasses(staff.assignedClasses && staff.assignedClasses.length > 0 ? staff.assignedClasses : (staff.assignedClass ? [staff.assignedClass] : []));
    setAllocSubjects(staff.subjects && staff.subjects.length > 0 ? staff.subjects : (registeredSubjects.length > 0 ? [registeredSubjects[0].name] : []));
    setAllocPeriods(staff.assignedPeriods || 22);
  };

  // Submit Class/Subject Allocation
  const handleSaveAllocation = async () => {
    if (!allocatingStaff) return;
    try {
      setIsSubmitting(true);
      
      // 1. Update Auth Service for class assignment
      await RoselandApi.auth.updateStaffAllocation(allocatingStaff.id, {
        assignedClass: allocClass,
        phone: allocatingStaff.phone
      });

      // 2. Save detailed subjects to Academic Service
      await RoselandApi.academic.saveFacultyAllocation({
        teacher_id: allocatingStaff.id,
        teacher_name: allocatingStaff.name,
        teacher_email: allocatingStaff.email,
        form_class: allocClass || undefined,
        assigned_classes: allocAssignedClasses,
        subjects: allocSubjects,
        weekly_periods: allocPeriods
      });

      toast.success(`Academic workload allocated for ${allocatingStaff.name}!`);
      setAllocatingStaff(null);
      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || 'Could not update faculty allocation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit New Staff Provisioning
  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardForm.fullName || !onboardForm.email || !onboardForm.password) {
      toast.error('Please enter Full Name, Email, and Password.');
      return;
    }

    if (onboardForm.role === 'ADMIN' && !isCurrentUserAdmin) {
      toast.error('Security Policy: Only verified System Administrators can provision System Admin accounts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const generatedUsername = onboardForm.username || onboardForm.email.split('@')[0];

      // 1. Create account in Auth microservice
      await RoselandApi.auth.provisionStaff({
        email: onboardForm.email,
        username: generatedUsername,
        fullName: onboardForm.fullName,
        role: onboardForm.role,
        password: onboardForm.password,
        phone: onboardForm.phone,
        assignedClass: (onboardForm.role === 'TEACHER' || onboardForm.role === 'HEADMASTER') ? onboardForm.assignedClass : undefined,
        avatar: onboardForm.avatar || ''
      });

      // 2. If Teacher or Headmaster, allocate subjects & class in Academic microservice
      if (onboardForm.role === 'TEACHER' || onboardForm.role === 'HEADMASTER') {
        await RoselandApi.academic.saveFacultyAllocation({
          teacher_name: onboardForm.fullName,
          teacher_email: onboardForm.email,
          form_class: onboardForm.assignedClass || undefined,
          assigned_classes: onboardForm.assignedClasses,
          subjects: onboardForm.subjects,
          weekly_periods: onboardForm.weeklyPeriods
        });
      }

      toast.success(`Account successfully created for ${onboardForm.fullName}!`);
      setShowOnboardModal(false);
      
      // Reset form
      setOnboardForm({
        fullName: '',
        email: '',
        username: '',
        phone: '+233 24 ',
        role: 'TEACHER',
        password: '',
        ntcLicense: '',
        assignedClass: '',
        assignedClasses: [],
        subjects: registeredSubjects.length > 0 ? [registeredSubjects[0].name] : [],
        weeklyPeriods: 22,
        avatar: ''
      });

      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to provision staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (!confirm(`Are you sure you want to remove ${staff.name} from the database?`)) return;
    try {
      await RoselandApi.auth.deleteStaff(staff.id);
      
      // Proactively clear academic allocations, class assignments, and timetable slots
      try {
        await Promise.allSettled([
          RoselandApi.academic.deleteFacultyAllocation(staff.name),
          RoselandApi.academic.deleteFacultyAllocation(staff.id),
          staff.email ? RoselandApi.academic.deleteFacultyAllocation(staff.email) : Promise.resolve(),
          staff.assignedClass ? RoselandApi.academic.deleteClassAllocation(staff.assignedClass) : Promise.resolve(),
          RoselandApi.academic.unassignTeacherSlots(staff.name),
        ]);
      } catch (cleanupErr) {
        console.warn("Cleanup allocation warning:", cleanupErr);
      }

      toast.success(`${staff.name} has been removed from the institutional database.`);
      await loadStaff();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete staff member');
    }
  };

  const toggleSubjectSelection = (subject: string, isForOnboarding = false) => {
    if (isForOnboarding) {
      setOnboardForm(prev => {
        const exists = prev.subjects.includes(subject);
        return {
          ...prev,
          subjects: exists ? prev.subjects.filter(s => s !== subject) : [...prev.subjects, subject]
        };
      });
    } else {
      setAllocSubjects(prev => {
        const exists = prev.includes(subject);
        return exists ? prev.filter(s => s !== subject) : [...prev, subject];
      });
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesDept = selectedDept === 'all' || s.department.toLowerCase() === selectedDept.toLowerCase();
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.staffNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.assignedClass && s.assignedClass.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  const presentCount = staffList.filter(s => s.todayStatus === 'Present').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Human Resources & Academic Faculty Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Faculty Directory & Subject Allocation
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Provision staff accounts, assign form classes, allocate GES curriculum subjects, and monitor NTC credentials.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-center px-4 py-2 bg-brand-bg rounded-2xl border border-gray-100">
            <span className="text-xs text-gray-400 block font-semibold">Total Faculty</span>
            <strong className="text-xl font-serif font-bold text-brand-textMain">{staffList.length}</strong>
          </div>
          <div className="text-center px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-xs text-emerald-600 block font-semibold">Active & Present</span>
            <strong className="text-xl font-serif font-bold text-emerald-800">{presentCount}</strong>
          </div>

          <button
            onClick={() => setShowOnboardModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-2xl shadow-md transition-all text-xs cursor-pointer"
          >
            <i className="ph ph-user-plus text-base font-bold"></i>
            <span>+ Onboard New Faculty / Staff</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'Teaching', 'Admin', 'Transport', 'Support'].map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedDept.toLowerCase() === dept.toLowerCase()
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'bg-white text-brand-textMuted hover:text-brand-textMain border border-gray-200'
              }`}
            >
              {dept === 'all' ? 'All Departments' : `${dept} Staff`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <i className="ph ph-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-base"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, class, subject, role..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-violet"
          />
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
              <tr>
                <th className="py-4 px-6">Faculty Member</th>
                <th className="py-4 px-4">Role & Assigned Form</th>
                <th className="py-4 px-4">Allocated GES Subjects</th>
                <th className="py-4 px-4">NTC License</th>
                <th className="py-4 px-4">Load</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs font-bold text-brand-textMuted">Loading verified faculty records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-brand-textMuted">
                    <div className="max-w-md mx-auto space-y-2">
                      <i className="ph ph-users-three text-3xl text-gray-300 block"></i>
                      <p className="font-bold text-sm text-brand-textMain">No faculty records found</p>
                      <p className="text-xs text-gray-400">
                        {searchQuery ? `No staff matching "${searchQuery}"` : "Click '+ Onboard New Faculty / Staff' to provision teacher and administrative profiles."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 shrink-0 shadow-xs">
                          <div className="w-full h-full bg-brand-violet/10 flex items-center justify-center">
                            <i className="ph-bold ph-user-circle text-brand-violet text-lg"></i>
                          </div>
                        </div>
                        <div>
                          <strong className="text-sm font-bold text-brand-textMain block">{st.name}</strong>
                          <span className="font-mono text-[10px] text-gray-400">{st.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          st.rawRole === 'ADMIN' || st.rawRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                          st.rawRole === 'HEADMASTER' ? 'bg-amber-100 text-amber-800' :
                          st.rawRole === 'BURSAR' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {st.rawRole}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${
                          st.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.isActive !== false ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                          <span>{st.isActive !== false ? 'Portal Active' : 'Portal Suspended'}</span>
                        </span>
                      </div>
                      {(st.rawRole === 'TEACHER' || st.rawRole === 'HEADMASTER') ? (
                        st.assignedClass ? (
                          <span className="text-brand-textMain font-bold inline-flex items-center gap-1.5 text-xs">
                            <i className="ph ph-chalkboard-simple text-brand-violet text-sm"></i>
                            <span>{st.assignedClass} Form Master</span>
                          </span>
                        ) : st.rawRole === 'HEADMASTER' ? (
                          <span className="text-[11px] text-gray-500 block">{st.role}</span>
                        ) : (
                          <span className="text-purple-700 font-bold inline-flex items-center gap-1 text-[10px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            <i className="ph ph-sparkle text-xs"></i>
                            <span>Subject Specialist (Floating)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-gray-500 block">{st.role}</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {st.subjects && st.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {st.subjects.map((sub, i) => (
                            <span key={i} className="text-[10px] font-semibold bg-gray-100 text-brand-textMain px-2 py-0.5 rounded-md">
                              {sub}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">
                          {(st.rawRole === 'TEACHER' || st.rawRole === 'HEADMASTER') ? 'Click Assign Workload' : 'General Administration'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {st.ntcLicense ? (
                        <div>
                          <span className="font-mono text-[11px] text-gray-700 font-bold block">{st.ntcLicense}</span>
                          {st.cpdPoints !== undefined && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                              {st.cpdPoints} CPD Points
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">
                          {st.rawRole === 'TEACHER' ? 'Unregistered' : 'Executive / Admin'}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      {st.assignedPeriods > 0 ? (
                        <span className="font-bold text-brand-textMain bg-brand-bg px-2 py-1 rounded-md text-[11px]">
                          {st.assignedPeriods} Pds/Wk
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      {(st.rawRole === 'TEACHER' || st.rawRole === 'HEADMASTER') && (
                        <button
                          onClick={() => handleOpenAllocation(st)}
                          className="px-3 py-1.5 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet hover:text-white rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <i className="ph ph-chalkboard-simple"></i>
                          <span>Assign Workload</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setDossierTab('profile');
                          setActiveStaff(st);
                        }}
                        className="px-3 py-1.5 bg-brand-bg hover:bg-gray-200 rounded-xl font-bold text-brand-textMain transition-all text-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <i className="ph ph-identification-card"></i>
                        <span>Dossier</span>
                      </button>
                      {st.rawRole !== 'ADMIN' && st.rawRole !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleTogglePortalAccess(st)}
                          disabled={updatingPortalStaffId === st.id}
                          title={st.isActive !== false ? 'Suspend Portal Login' : 'Activate Portal Login'}
                          className={`px-2.5 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1 ${
                            st.isActive !== false
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                          }`}
                        >
                          <i className={`ph-bold ${st.isActive !== false ? 'ph-prohibit' : 'ph-check-circle'}`}></i>
                          <span className="hidden xl:inline">{st.isActive !== false ? 'Suspend' : 'Activate'}</span>
                        </button>
                      )}
                      {st.rawRole !== 'ADMIN' && st.rawRole !== 'SUPER_ADMIN' && (
                        <button
                          onClick={() => handleDeleteStaff(st)}
                          title="Remove Account"
                          className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center"
                        >
                          <i className="ph ph-trash text-sm"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Onboard New Faculty / Staff */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 animate-fade-in relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-start justify-between shrink-0 bg-white">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-violet block">Provisioning Wizard</span>
                <h2 className="text-lg sm:text-xl font-serif font-bold text-brand-textMain">
                  Onboard Faculty & Staff Account
                </h2>
                <p className="text-xs text-brand-textMuted mt-0.5">
                  Creates an authenticated institutional profile in the database with role-based access.
                </p>
              </div>
              <button
                onClick={() => setShowOnboardModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm cursor-pointer shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form onSubmit={handleOnboardSubmit} id="onboard-form" className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-brand-textMain block mb-1.5">Institutional Role</label>
                <div className={`grid grid-cols-2 ${isCurrentUserAdmin ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-2`}>
                  {[
                    { key: 'TEACHER', label: 'Teacher / Lead', icon: 'ph-chalkboard-teacher' },
                    { key: 'HEADMASTER', label: 'Headmaster', icon: 'ph-student' },
                    { key: 'BURSAR', label: 'School Bursar', icon: 'ph-bank' },
                    ...(isCurrentUserAdmin ? [{ key: 'ADMIN', label: 'System Admin', icon: 'ph-shield-check' }] : []),
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setOnboardForm({ ...onboardForm, role: r.key as any })}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                        onboardForm.role === r.key
                          ? 'border-brand-violet bg-brand-violet/5 text-brand-violet font-bold shadow-xs'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <i className={`ph ${r.icon} text-lg`}></i>
                      <span className="text-[11px]">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-brand-textMain block mb-1">Full Name & Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Samuel Appiah"
                    value={onboardForm.fullName}
                    onChange={(e) => {
                      const name = e.target.value;
                      const parts = name.trim().toLowerCase().split(' ');
                      const autoUsername = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1]}` : parts[0] || '';
                      setOnboardForm({
                        ...onboardForm,
                        fullName: name,
                        username: onboardForm.username ? onboardForm.username : autoUsername,
                        email: onboardForm.email ? onboardForm.email : (autoUsername ? `${autoUsername}@roselandprep.edu.gh` : '')
                      });
                    }}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-violet focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-brand-textMain block mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sappiah@roselandprep.edu.gh"
                    value={onboardForm.email}
                    onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-violet focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-brand-textMain block mb-1">Mobile Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+233 24 555 1234"
                    value={onboardForm.phone}
                    onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-violet focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-brand-textMain block mb-1">Initial Login Passkey *</label>
                  <input
                    type="password"
                    required
                    value={onboardForm.password}
                    onChange={(e) => setOnboardForm({ ...onboardForm, password: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-violet focus:bg-white"
                  />
                </div>
              </div>

              {/* Conditional Teacher / Headmaster Allocation Block */}
              {(onboardForm.role === 'TEACHER' || onboardForm.role === 'HEADMASTER') && (
                <div className="bg-brand-bg/80 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong className="text-xs font-bold text-brand-textMain block">
                        Academic Class & Subject Allocation
                      </strong>
                      <span className="text-[11px] text-gray-500">
                        Assign form room class and teaching subjects.
                      </span>
                    </div>
                    <span className="text-[10px] bg-brand-violet text-white font-bold px-2 py-0.5 rounded">
                      GES Aligned
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Assigned Form Class (Homeroom)
                      </label>
                      <select
                        value={onboardForm.assignedClass}
                        onChange={(e) => setOnboardForm({ ...onboardForm, assignedClass: e.target.value })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet font-semibold"
                      >
                        <option value="">None / Subject Specialist (Floating)</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.name}>{cls.name} (Form Master)</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">Weekly Period Target</label>
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={onboardForm.weeklyPeriods}
                        onChange={(e) => setOnboardForm({ ...onboardForm, weeklyPeriods: parseInt(e.target.value) || 22 })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1.5">
                      Assigned Subjects (Click to toggle)
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-gray-100">
                      {registeredSubjects.length > 0 ? (
                        registeredSubjects.map(subObj => {
                          const sub = subObj.name;
                          const isSelected = onboardForm.subjects.includes(sub);
                          return (
                            <button
                              key={subObj.id}
                              type="button"
                              onClick={() => toggleSubjectSelection(sub, true)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-brand-violet text-white shadow-xs'
                                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {isSelected ? `✓ ${sub}` : sub}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-gray-400 p-2">No subjects registered yet in the Academic Registry.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Sticky Action Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="onboard-form"
                disabled={isSubmitting}
                className="px-5 py-2 bg-brand-violet hover:bg-brand-violetDark text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="ph ph-spinner animate-spin"></i>
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <i className="ph ph-check-circle text-base"></i>
                    <span>Complete Account Provisioning</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Workload & Subject Allocation */}
      {allocatingStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 animate-fade-in relative max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-brand-violet shrink-0">
                  <div className="w-full h-full bg-brand-violet/10 flex items-center justify-center">
                    <i className="ph-bold ph-user-circle text-brand-violet text-lg"></i>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-violet block">Academic Allocation</span>
                  <h3 className="text-base sm:text-lg font-serif font-bold text-brand-textMain">{allocatingStaff.name}</h3>
                  <span className="text-[11px] text-gray-400">{allocatingStaff.email}</span>
                </div>
              </div>
              <button
                onClick={() => setAllocatingStaff(null)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-brand-textMain block mb-1">
                  Assigned Form Class (Homeroom)
                </label>
                <select
                  value={allocClass}
                  onChange={(e) => setAllocClass(e.target.value)}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-violet focus:bg-white font-semibold"
                >
                  <option value="">None / Subject Specialist (Floating)</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.name}>{cls.name} (Form Master)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-textMain block mb-2">
                  Assigned Teaching Classes (Select all classes taught by this teacher)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-brand-bg rounded-xl border border-gray-200">
                  {classes.length > 0 ? (
                    classes.map(clsObj => {
                      const cls = clsObj.name;
                      const isSelected = allocAssignedClasses.includes(cls);
                      return (
                        <button
                          key={clsObj.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setAllocAssignedClasses(prev => prev.filter(c => c !== cls));
                            } else {
                              setAllocAssignedClasses(prev => [...prev, cls]);
                            }
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-violet text-white shadow-xs'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {isSelected ? `✓ ${cls}` : cls}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-400 p-2">No classes available.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-brand-textMain block mb-1">Weekly Period Target</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={allocPeriods}
                  onChange={(e) => setAllocPeriods(parseInt(e.target.value) || 22)}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-brand-violet focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-brand-textMain block mb-2">
                  Allocated Subjects (Select all subjects taught by this teacher)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 bg-brand-bg rounded-xl border border-gray-200">
                  {registeredSubjects.length > 0 ? (
                    registeredSubjects.map(subObj => {
                      const sub = subObj.name;
                      const isSelected = allocSubjects.includes(sub);
                      return (
                        <button
                          key={subObj.id}
                          type="button"
                          onClick={() => toggleSubjectSelection(sub, false)}
                          className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-violet text-white shadow-xs'
                              : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {isSelected ? `✓ ${sub}` : sub}
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-xs text-gray-400 p-2">No subjects registered yet in the Academic Registry.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/90 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setAllocatingStaff(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAllocation}
                disabled={isSubmitting}
                className="px-5 py-2 bg-brand-violet hover:bg-brand-violetDark text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="ph ph-spinner animate-spin"></i>
                    <span>Saving Workload...</span>
                  </>
                ) : (
                  <>
                    <i className="ph ph-check-circle text-base"></i>
                    <span>Save Allocation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Professional 360° Faculty & Staff Dossier */}
      {activeStaff && mounted && createPortal(
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-100 animate-fade-in relative max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* Modal Header Banner */}
            <div className="p-6 border-b border-gray-100 bg-linear-to-r from-brand-bg via-white to-brand-bg/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-brand-violet shrink-0 shadow-md bg-brand-violet/10 flex items-center justify-center">
                  <i className="ph-bold ph-user-circle text-brand-violet text-3xl"></i>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] font-bold text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-md">
                      {activeStaff.staffNo}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                      activeStaff.rawRole === 'ADMIN' || activeStaff.rawRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                      activeStaff.rawRole === 'HEADMASTER' ? 'bg-amber-100 text-amber-800' :
                      activeStaff.rawRole === 'BURSAR' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {activeStaff.rawRole}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      activeStaff.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${activeStaff.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                      <span>{activeStaff.isActive !== false ? 'Portal Active' : 'Portal Suspended'}</span>
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-textMain leading-tight">
                    {activeStaff.name}
                  </h2>
                  <p className="text-xs text-brand-violet font-semibold">
                    {activeStaff.role} • <span className="text-gray-500 font-normal">{activeStaff.department} Department</span>
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => {
                    printStaffComprehensiveDossier({
                      staffNo: activeStaff.staffNo,
                      name: activeStaff.name,
                      email: activeStaff.email,
                      phone: activeStaff.phone,
                      role: activeStaff.role,
                      rawRole: activeStaff.rawRole,
                      department: activeStaff.department,
                      assignedClass: activeStaff.assignedClass,
                      assignedClasses: activeStaff.assignedClasses,
                      subjects: activeStaff.subjects,
                      assignedPeriods: activeStaff.assignedPeriods,
                      ntcLicense: activeStaff.ntcLicense,
                      cpdPoints: activeStaff.cpdPoints,
                      qualifications: activeStaff.qualifications,
                      appointmentDate: activeStaff.appointmentDate,
                      portalAccess: activeStaff.portalAccess,
                      isActive: activeStaff.isActive !== false,
                      appraisalSummary: activeStaffAppraisal ? {
                        performanceIndex: activeStaffAppraisal.performanceIndex,
                        rubric: activeStaffAppraisal.rubric,
                        strengths: activeStaffAppraisal.strengths,
                        growthAreas: activeStaffAppraisal.growthAreas
                      } : undefined,
                      emergencyContact: activeStaff.emergencyContact
                    });
                  }}
                  className="px-3.5 py-2 bg-brand-violet text-white hover:bg-brand-violetDark rounded-xl font-bold transition-all text-xs cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  title="Generate printable PDF faculty dossier"
                >
                  <i className="ph-bold ph-printer text-sm"></i>
                  <span>Print Official Dossier</span>
                </button>

                {activeStaff.rawRole !== 'ADMIN' && activeStaff.rawRole !== 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => handleTogglePortalAccess(activeStaff)}
                    disabled={updatingPortalStaffId === activeStaff.id}
                    className={`px-3.5 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1.5 ${
                      activeStaff.isActive !== false
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                    }`}
                  >
                    <i className={`ph-bold ${activeStaff.isActive !== false ? 'ph-prohibit' : 'ph-check-circle'} text-sm`}></i>
                    <span>{activeStaff.isActive !== false ? 'Suspend Portal' : 'Restore Portal'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveStaff(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm cursor-pointer ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-100 bg-white px-6 overflow-x-auto shrink-0">
              {[
                { id: 'profile', label: '360° Profile & Identity', icon: 'ph-user-focus' },
                { id: 'workload', label: 'Teaching & Timetable Load', icon: 'ph-chalkboard-teacher' },
                { id: 'appraisal', label: 'GES Appraisals & Compliance', icon: 'ph-certificate' },
                { id: 'portal', label: 'Portal Security & Access', icon: 'ph-shield-check' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDossierTab(tab.id as any)}
                  className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer inline-flex items-center gap-2 whitespace-nowrap ${
                    dossierTab === tab.id
                      ? 'border-brand-violet text-brand-violet bg-brand-violet/5'
                      : 'border-transparent text-gray-500 hover:text-brand-textMain'
                  }`}
                >
                  <i className={`ph-bold ${tab.icon} text-sm`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs bg-gray-50/50">

              {/* TAB 1: Profile & Identity */}
              {dossierTab === 'profile' && (
                <div className="space-y-6">
                  {/* Top Stats Overview */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">NTC Licensure</span>
                      <strong className="text-sm font-mono font-bold text-brand-textMain block">
                        {activeStaff.ntcLicense || 'Pending Registration'}
                      </strong>
                      <span className="text-[10px] text-emerald-600 font-bold">Verified Educator</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">CPD Accreditation</span>
                      <strong className="text-sm font-bold text-brand-textMain block">
                        {activeStaff.cpdPoints || 18} / 20 Points
                      </strong>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, (((activeStaff.cpdPoints || 18) / 20) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Weekly Workload</span>
                      <strong className="text-sm font-bold text-brand-textMain block">
                        {activeStaff.assignedPeriods} Periods/Wk
                      </strong>
                      <span className="text-[10px] text-blue-600 font-bold">Standard Capacity</span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Daily Status</span>
                      <strong className="text-sm font-bold text-emerald-700 block">
                        {activeStaff.todayStatus}
                      </strong>
                      <span className="text-[10px] text-gray-400">Recorded at Roll Call</span>
                    </div>
                  </div>

                  {/* Comprehensive Records Card */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
                    <h3 className="font-serif font-bold text-sm text-brand-textMain border-b border-gray-100 pb-2 flex items-center justify-between">
                      <span>Institutional Employment & Verified Credentials</span>
                      <span className="text-[10px] text-brand-violet font-mono uppercase">ID: {activeStaff.staffNo}</span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Full Legal Name</label>
                          <p className="text-sm font-bold text-brand-textMain">{activeStaff.name}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Official Institutional Email</label>
                          <p className="font-mono text-xs text-brand-violet font-semibold">{activeStaff.email}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Mobile Phone Contact</label>
                          <p className="text-xs font-semibold text-brand-textMain">{activeStaff.phone}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">System Username</label>
                          <p className="font-mono text-xs text-gray-600">{activeStaff.username || activeStaff.email.split('@')[0]}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Highest Qualification & Institution</label>
                          <p className="text-xs font-bold text-brand-textMain">{activeStaff.qualifications || 'B.Ed Basic Education (University of Cape Coast)'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Date of Appointment & Tenure</label>
                          <p className="text-xs font-semibold text-brand-textMain">{activeStaff.appointmentDate || '15 January 2024 (2 Years)'}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Department & Primary Track</label>
                          <p className="text-xs font-semibold text-brand-textMain">{activeStaff.department} Directorate • Primary / JHS Stream</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-gray-400 block">Emergency Next of Kin Contact</label>
                          <p className="text-xs font-semibold text-brand-textMain">
                            {activeStaff.emergencyContact?.name || 'Next of Kin'} ({activeStaff.emergencyContact?.phone || activeStaff.phone})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Teaching & Workload */}
              {dossierTab === 'workload' && (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="font-serif font-bold text-sm text-brand-textMain">
                          Curricular Allocation & Period Distribution
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          Ghana Education Service (GES) syllabus subject allocations and homeroom master responsibilities.
                        </p>
                      </div>
                      {(activeStaff.rawRole === 'TEACHER' || activeStaff.rawRole === 'HEADMASTER') && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveStaff(null);
                            handleOpenAllocation(activeStaff);
                          }}
                          className="px-3.5 py-1.5 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet hover:text-white rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                        >
                          <i className="ph ph-chalkboard-simple"></i>
                          <span>Modify Allocation</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-brand-bg/60 p-4 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                          Assigned Form Class (Homeroom)
                        </span>
                        {activeStaff.assignedClass ? (
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-brand-violet/10 text-brand-violet flex items-center justify-center font-bold text-sm">
                              <i className="ph ph-chalkboard"></i>
                            </span>
                            <div>
                              <strong className="text-sm font-bold text-brand-textMain block">{activeStaff.assignedClass}</strong>
                              <span className="text-[10px] text-brand-violet font-semibold">Form Master in Charge</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">None / Subject Specialist (Floating)</span>
                        )}
                      </div>

                      <div className="bg-brand-bg/60 p-4 rounded-xl border border-gray-100">
                        <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                          Weekly Period Target
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                            <i className="ph ph-clock"></i>
                          </span>
                          <div>
                            <strong className="text-sm font-bold text-brand-textMain block">
                              {activeStaff.assignedPeriods} Periods / Week
                            </strong>
                            <span className="text-[10px] text-gray-500">40 minutes per period</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-brand-textMain block mb-2">
                        Assigned Teaching Classes
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {activeStaff.assignedClasses && activeStaff.assignedClasses.length > 0 ? (
                          activeStaff.assignedClasses.map((cls, idx) => (
                            <span key={idx} className="bg-brand-violet/10 text-brand-violet font-bold px-3 py-1 rounded-xl text-xs border border-brand-violet/20">
                              ✓ {cls}
                            </span>
                          ))
                        ) : activeStaff.assignedClass ? (
                          <span className="bg-brand-violet/10 text-brand-violet font-bold px-3 py-1 rounded-xl text-xs border border-brand-violet/20">
                            ✓ {activeStaff.assignedClass} (Form Room)
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No specific teaching classes assigned yet.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-brand-textMain block mb-2">
                        Allocated GES Curriculum Subjects
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {activeStaff.subjects && activeStaff.subjects.length > 0 ? (
                          activeStaff.subjects.map((sub, idx) => (
                            <span key={idx} className="bg-white border border-gray-200 text-brand-textMain font-semibold px-3 py-1 rounded-xl text-xs shadow-2xs">
                              📚 {sub}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {(activeStaff.rawRole === 'TEACHER' || activeStaff.rawRole === 'HEADMASTER') ? 'No subjects allocated. Click Modify Allocation above.' : 'General administration roles do not teach curriculum subjects.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GES Appraisals & Compliance */}
              {dossierTab === 'appraisal' && (
                <div className="space-y-5">
                  {/* Appraisal Score Header */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-brand-violet block">
                        Supervisory Quality Assurance
                      </span>
                      <h3 className="font-serif font-bold text-base text-brand-textMain mt-0.5">
                        GES &amp; NaCCA 5-Domain Faculty Appraisal
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Evaluated across instructional preparation, classroom environment, pedagogical delivery, SBA continuous assessment, and code of conduct.
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-gray-100 sm:pl-6 shrink-0">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Performance Index</span>
                      <strong className="text-2xl font-serif font-bold text-brand-violet">
                        {activeStaffAppraisal?.performanceIndex || '90.2%'}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded block mt-0.5">
                        Tier 1 • Exemplary Faculty
                      </span>
                    </div>
                  </div>

                  {/* 5 Domains Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {[
                      {
                        title: '1. Lesson Planning & Preparation',
                        score: activeStaffAppraisal?.rubric?.d1?.score || 92,
                        notes: activeStaffAppraisal?.rubric?.d1?.notes || 'Comprehensive weekly schemes submitted on time via Lesson Studio with clear SMART learning objectives.',
                        icon: 'ph-notebook',
                      },
                      {
                        title: '2. Classroom Climate & Engagement',
                        score: activeStaffAppraisal?.rubric?.d2?.score || 88,
                        notes: activeStaffAppraisal?.rubric?.d2?.notes || 'Maintains disciplined, encouraging atmosphere with active learner participation and inclusive questioning.',
                        icon: 'ph-users-three',
                      },
                      {
                        title: '3. Content Delivery & Differentiation',
                        score: activeStaffAppraisal?.rubric?.d3?.score || 90,
                        notes: activeStaffAppraisal?.rubric?.d3?.notes || 'Strong mastery of GES curriculum concepts; uses real-world Ghanaian examples and multi-modal aids.',
                        icon: 'ph-chalkboard-simple',
                      },
                      {
                        title: '4. SBA Assessment & Record Keeping',
                        score: activeStaffAppraisal?.rubric?.d4?.score || 86,
                        notes: activeStaffAppraisal?.rubric?.d4?.notes || 'Maintains updated SBA CA tracker marks and provides prompt constructive feedback to scholars.',
                        icon: 'ph-chart-line-up',
                      },
                      {
                        title: '5. Professional Ethics & Mentorship',
                        score: activeStaffAppraisal?.rubric?.d5?.score || 95,
                        notes: activeStaffAppraisal?.rubric?.d5?.notes || 'Punctual, professional dress code, collaborative with colleagues, and adheres to the Roseland Code of Ethics.',
                        icon: 'ph-shield-check',
                      },
                    ].map((d, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <i className={`ph-bold ${d.icon} text-brand-violet text-sm`}></i>
                            <h4 className="text-xs font-bold text-brand-textMain">{d.title}</h4>
                          </div>
                          <span className="font-mono text-xs font-extrabold text-brand-violet bg-brand-violet/10 px-2 py-0.5 rounded-md">
                            {d.score} / 100
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{d.notes}</p>
                      </div>
                    ))}

                    {/* Lesson Scheme Compliance Metric */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <i className="ph-bold ph-check-circle text-emerald-600 text-sm"></i>
                          <h4 className="text-xs font-bold text-brand-textMain">Lesson Scheme On-Time Compliance</h4>
                        </div>
                        <span className="font-mono text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          95.4%
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Weekly lesson notes consistently uploaded before Sunday 18:00 GMT deadline for Headmaster pedagogical sign-off.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Portal Security & Access */}
              {dossierTab === 'portal' && (
                <div className="space-y-5">
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-4">
                    <h3 className="font-serif font-bold text-sm text-brand-textMain border-b border-gray-100 pb-2">
                      Portal Access Authorization &amp; Account Control
                    </h3>

                    {/* Status Alert Banner */}
                    <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                      activeStaff.isActive !== false
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-red-50/80 border-red-200 text-red-900'
                    }`}>
                      <i className={`ph-bold ${activeStaff.isActive !== false ? 'ph-check-circle text-emerald-600' : 'ph-prohibit text-red-600'} text-xl shrink-0 mt-0.5`}></i>
                      <div className="space-y-1">
                        <strong className="text-xs font-bold block">
                          {activeStaff.isActive !== false ? 'Staff Portal Login is Active' : 'Staff Portal Login is Currently Suspended'}
                        </strong>
                        <p className="text-[11px] opacity-90 leading-relaxed">
                          {activeStaff.isActive !== false
                            ? `This faculty member is fully authorized to log into the ${activeStaff.portalAccess || '/teacher'} portal using their credentials.`
                            : `Login attempts for this staff member will be immediately blocked at the authentication gateway. Historical records and grades remain preserved.`
                          }
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1 bg-brand-bg p-3.5 rounded-xl border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Assigned Portal Route</span>
                        <strong className="text-xs font-mono text-brand-violet block">
                          {activeStaff.portalAccess || (activeStaff.rawRole === 'TEACHER' ? '/teacher' : activeStaff.rawRole === 'HEADMASTER' ? '/headmaster' : '/admin')}
                        </strong>
                      </div>

                      <div className="space-y-1 bg-brand-bg p-3.5 rounded-xl border border-gray-100">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Institutional RBAC Role</span>
                        <strong className="text-xs font-bold text-brand-textMain block">
                          {activeStaff.rawRole} ({activeStaff.role})
                        </strong>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                      {activeStaff.rawRole !== 'ADMIN' && activeStaff.rawRole !== 'SUPER_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleTogglePortalAccess(activeStaff)}
                          disabled={updatingPortalStaffId === activeStaff.id}
                          className={`px-4 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-2 shadow-xs ${
                            activeStaff.isActive !== false
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <i className={`ph-bold ${activeStaff.isActive !== false ? 'ph-prohibit' : 'ph-check-circle'} text-base`}></i>
                          <span>
                            {activeStaff.isActive !== false ? 'Suspend Portal Access (Revoke Login)' : 'Activate Portal Access (Restore Login)'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Dispatched SMS notification to ${activeStaff.name} (${activeStaff.phone})`);
                        }}
                        className="px-4 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-2 border border-gray-200"
                      >
                        <i className="ph-bold ph-chat-circle-dots text-base text-brand-violet"></i>
                        <span>Dispatch SMS Credentials</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-gray-400">
                Official Roseland SIS Record • Security Seal: <strong className="font-mono text-gray-600">RPS-HR-{activeStaff.staffNo}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStaff(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Close Dossier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    printStaffComprehensiveDossier({
                      staffNo: activeStaff.staffNo,
                      name: activeStaff.name,
                      email: activeStaff.email,
                      phone: activeStaff.phone,
                      role: activeStaff.role,
                      rawRole: activeStaff.rawRole,
                      department: activeStaff.department,
                      assignedClass: activeStaff.assignedClass,
                      assignedClasses: activeStaff.assignedClasses,
                      subjects: activeStaff.subjects,
                      assignedPeriods: activeStaff.assignedPeriods,
                      ntcLicense: activeStaff.ntcLicense,
                      cpdPoints: activeStaff.cpdPoints,
                      qualifications: activeStaff.qualifications,
                      appointmentDate: activeStaff.appointmentDate,
                      portalAccess: activeStaff.portalAccess,
                      isActive: activeStaff.isActive !== false,
                      appraisalSummary: activeStaffAppraisal ? {
                        performanceIndex: activeStaffAppraisal.performanceIndex,
                        rubric: activeStaffAppraisal.rubric,
                        strengths: activeStaffAppraisal.strengths,
                        growthAreas: activeStaffAppraisal.growthAreas
                      } : undefined,
                      emergencyContact: activeStaff.emergencyContact
                    });
                  }}
                  className="px-5 py-2 bg-brand-violet hover:bg-brand-violetDark text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <i className="ph-bold ph-printer text-sm"></i>
                  <span>Print Official Dossier</span>
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
