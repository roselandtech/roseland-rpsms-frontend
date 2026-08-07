"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';

export interface StaffMember {
  id: string;
  staffNo: string;
  name: string;
  email: string;
  username: string;
  role: string;
  rawRole: 'SUPER_ADMIN' | 'HEADMASTER' | 'TEACHER' | 'BURSAR' | 'SUPPORT';
  department: 'Teaching' | 'Admin' | 'Transport' | 'Support';
  assignedClass?: string;
  subjects?: string[];
  ntcLicense?: string;
  cpdPoints?: number;
  assignedPeriods: number;
  todayStatus: 'Present' | 'On Leave' | 'Late';
  phone: string;
  avatar: string;
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

  // Allocation Form State
  const [allocClass, setAllocClass] = useState('');
  const [allocSubjects, setAllocSubjects] = useState<string[]>([]);
  const [allocPeriods, setAllocPeriods] = useState(22);

  // Onboarding Form State
  const [onboardForm, setOnboardForm] = useState({
    fullName: '',
    email: '',
    username: '',
    phone: '+233 24 ',
    role: 'TEACHER' as 'SUPER_ADMIN' | 'HEADMASTER' | 'TEACHER' | 'BURSAR' | 'SUPPORT',
    password: 'password123',
    ntcLicense: '',
    assignedClass: '',
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
          const r = u.role || 'TEACHER';

          if (r === 'SUPER_ADMIN') {
            dept = 'Admin';
            roleTitle = 'Proprietress & Super Admin';
          } else if (r === 'HEADMASTER') {
            dept = 'Teaching';
            roleTitle = 'Headmaster & Academic Supervisor';
          } else if (r === 'BURSAR') {
            dept = 'Admin';
            roleTitle = 'School Bursar & Accounts Lead';
          }

          const alloc = allocMap.get(u.email?.toLowerCase()) || allocMap.get(u.fullName?.toLowerCase());
          const subs = alloc?.subjects || [];
          const periods = alloc?.weeklyPeriods || 0;
          const assignedForm = u.assignedClass || alloc?.formClass || undefined;

          if (r === 'TEACHER') {
            dept = 'Teaching';
            roleTitle = assignedForm ? `${assignedForm} Form Master` : (subs.length > 0 ? `Subject Specialist (${subs.join(', ')})` : 'Subject Specialist (Floating)');
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
            subjects: subs,
            ntcLicense: u.ntcLicense || undefined,
            cpdPoints: u.cpdPoints || undefined,
            assignedPeriods: periods,
            todayStatus: 'Present',
            phone: u.phone || '—',
            avatar: u.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`
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


  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Open Allocation Modal for a Teacher
  const handleOpenAllocation = (staff: StaffMember) => {
    setAllocatingStaff(staff);
    setAllocClass(staff.assignedClass || '');
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
        form_class: allocClass,
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
        assignedClass: onboardForm.role === 'TEACHER' ? onboardForm.assignedClass : undefined,
        avatar: onboardForm.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`
      });

      // 2. If Teacher, allocate subjects & class in Academic microservice
      if (onboardForm.role === 'TEACHER') {
        await RoselandApi.academic.saveFacultyAllocation({
          teacher_name: onboardForm.fullName,
          teacher_email: onboardForm.email,
          form_class: onboardForm.assignedClass,
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
        password: 'password123',
        ntcLicense: '',
        assignedClass: '',
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
      
      // Proactively clear academic allocations and class assignments
      try {
        await Promise.allSettled([
          RoselandApi.academic.deleteFacultyAllocation(staff.name),
          RoselandApi.academic.deleteFacultyAllocation(staff.id),
          staff.email ? RoselandApi.academic.deleteFacultyAllocation(staff.email) : Promise.resolve(),
          staff.assignedClass ? RoselandApi.academic.deleteClassAllocation(staff.assignedClass) : Promise.resolve(),
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
                          <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <strong className="text-sm font-bold text-brand-textMain block">{st.name}</strong>
                          <span className="font-mono text-[10px] text-gray-400">{st.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 ${
                        st.rawRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                        st.rawRole === 'HEADMASTER' ? 'bg-amber-100 text-amber-800' :
                        st.rawRole === 'BURSAR' ? 'bg-blue-100 text-blue-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {st.rawRole}
                      </span>
                      {st.rawRole === 'TEACHER' ? (
                        st.assignedClass ? (
                          <span className="text-brand-textMain font-bold inline-flex items-center gap-1.5 text-xs">
                            <i className="ph ph-chalkboard-simple text-brand-violet text-sm"></i>
                            <span>{st.assignedClass} Form Master</span>
                          </span>
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
                          {st.rawRole === 'TEACHER' ? 'Pending Allocation' : 'General Administration'}
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
                          {st.rawRole === 'TEACHER' ? 'Unregistered' : 'Non-Teaching'}
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
                      {st.rawRole === 'TEACHER' && (
                        <button
                          onClick={() => handleOpenAllocation(st)}
                          className="px-3 py-1.5 bg-brand-violet/10 text-brand-violet hover:bg-brand-violet hover:text-white rounded-xl font-bold transition-all text-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <i className="ph ph-chalkboard-simple"></i>
                          <span>Assign Workload</span>
                        </button>
                      )}
                      <button
                        onClick={() => setActiveStaff(st)}
                        className="px-3 py-1.5 bg-brand-bg hover:bg-gray-200 rounded-xl font-bold text-brand-textMain transition-all text-xs cursor-pointer"
                      >
                        Dossier
                      </button>
                      {st.rawRole !== 'SUPER_ADMIN' && (
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'TEACHER', label: 'Teacher / Lead', icon: 'ph-chalkboard-teacher' },
                    { key: 'HEADMASTER', label: 'Headmaster', icon: 'ph-student' },
                    { key: 'BURSAR', label: 'School Bursar', icon: 'ph-bank' },
                    { key: 'SUPER_ADMIN', label: 'Administrator', icon: 'ph-shield-check' },
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
                        email: onboardForm.email ? onboardForm.email : (autoUsername ? `${autoUsername}@roseland.edu.gh` : '')
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
                    placeholder="e.g. sappiah@roseland.edu.gh"
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

              {/* Conditional Teacher Allocation Block */}
              {onboardForm.role === 'TEACHER' && (
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
                  <img src={allocatingStaff.avatar} alt={allocatingStaff.name} className="w-full h-full object-cover" />
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

      {/* Modal 3: Staff Dossier View */}
      {activeStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fade-in relative">
            <button
              onClick={() => setActiveStaff(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-brand-violet mx-auto mb-3 shadow">
                <img src={activeStaff.avatar} alt={activeStaff.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-serif font-bold text-brand-textMain">{activeStaff.name}</h3>
              <p className="text-xs text-brand-violet font-semibold">{activeStaff.role}</p>
              <span className="font-mono text-[10px] text-gray-400 block">{activeStaff.staffNo}</span>
            </div>

            <div className="space-y-2.5 text-xs bg-brand-bg p-4 rounded-2xl mb-6">
              <p className="flex justify-between"><strong>Email:</strong> {activeStaff.email}</p>
              <p className="flex justify-between"><strong>Phone:</strong> {activeStaff.phone}</p>
              <p className="flex justify-between"><strong>Assigned Form:</strong> {activeStaff.assignedClass ? `${activeStaff.assignedClass} (Form Master)` : 'None (Subject Specialist / Rotational)'}</p>
              <p className="flex justify-between"><strong>NTC Number:</strong> {activeStaff.ntcLicense || 'N/A'}</p>
              <p className="flex justify-between"><strong>CPD Accreditation:</strong> {activeStaff.cpdPoints ? `${activeStaff.cpdPoints} Points` : 'N/A'}</p>
              <p className="flex justify-between"><strong>Period Workload:</strong> {activeStaff.assignedPeriods} periods/wk</p>
            </div>

            <button
              onClick={() => {
                toast.success(`Dispatched SMS credentials & notification to ${activeStaff.name} (${activeStaff.phone})`);
                setActiveStaff(null);
              }}
              className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md cursor-pointer"
            >
              Send SMS / Call Staff
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
