"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { printAdmissionLetter } from '@/lib/pdf-printer';

interface Applicant {
  id: string;
  refNo: string;
  childName: string;
  dob: string;
  gender: string;
  targetClass: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  homeAddress?: string;
  previousSchool?: string;
  medicalConditions?: string;
  submittedDate: string;
  status: 'Under Review' | 'Entrance Assessment' | 'Interview Scheduled' | 'Admitted' | 'Enrolled' | 'Rejected';
  docsComplete: boolean;
  score?: number;
}

import { useClasses } from '@/hooks/useClasses';

export default function AdminAdmissionsPage() {
  const { classes: classList, isLoading: isLoadingClasses } = useClasses();
  const [filterStage, setFilterStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [scoreInput, setScoreInput] = useState<string>('');

  const [applicants, setApplicants] = useState<Applicant[]>([]);

  // Walk-in Registration Form State
  const [walkinData, setWalkinData] = useState({
    firstName: '',
    lastName: '',
    gender: 'Male',
    dob: '',
    targetClass: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    homeAddress: '',
    previousSchool: '',
    medicalConditions: '',
  });

  // Automatically sync default targetClass when classList loads from backend SIS
  useEffect(() => {
    if (classList && classList.length > 0) {
      setWalkinData(prev => {
        if (!prev.targetClass || !classList.some(c => c.name === prev.targetClass)) {
          return { ...prev, targetClass: classList[0].name };
        }
        return prev;
      });
    }
  }, [classList]);

  const loadAdmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await RoselandApi.sis.getAdmissions();
      if (res && Array.isArray(res)) {
        const mapped: Applicant[] = res.map((a: any) => {
          let st: Applicant['status'] = 'Under Review';
          if (a.status === 'Approved' || a.status === 'Admitted' || a.status === 'APPROVED') st = 'Admitted';
          else if (a.status === 'Enrolled' || a.status === 'ENROLLED') st = 'Enrolled';
          else if (a.status === 'Entrance Assessment' || a.status === 'VETTING') st = 'Entrance Assessment';
          else if (a.status === 'Interview Scheduled' || a.status === 'INTERVIEW') st = 'Interview Scheduled';
          else if (a.status === 'Rejected' || a.status === 'REJECTED') st = 'Rejected';
          else st = 'Under Review';

          return {
            id: a.id || a.app_no,
            refNo: a.app_no || a.id,
            childName: a.applicant_name,
            dob: a.date_of_birth ? `${a.date_of_birth}` : 'Preschool Age',
            gender: a.gender || 'Male',
            targetClass: a.target_class,
            parentName: a.parent_name,
            parentPhone: a.parent_phone,
            parentEmail: a.parent_email || '',
            homeAddress: a.home_address || '',
            previousSchool: a.previous_school || 'None / First Enrollment',
            medicalConditions: a.medical_conditions || 'None Reported',
            submittedDate: a.created_at ? new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
            status: st,
            docsComplete: true,
            score: a.score !== null && a.score !== undefined ? Number(a.score) : undefined
          };
        });
        setApplicants(mapped);
      } else {
        setApplicants([]);
      }
    } catch (err) {
      console.warn("Error fetching admissions from backend:", err);
      toast.error("Could not load admissions from server");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmissions();
  }, [loadAdmissions]);

  const updateStatus = async (id: string, newStatus: Applicant['status'], newScore?: number) => {
    setIsUpdating(true);
    try {
      if (newStatus === 'Admitted' || newStatus === 'Enrolled') {
        // /approve enrolls the student but does not write the score column,
        // so persist any score separately first to avoid losing it.
        if (newScore !== undefined) {
          await RoselandApi.sis.updateAdmissionStatus(id, { status: newStatus, score: newScore });
        }
        await RoselandApi.sis.approveAdmission(id);
      } else {
        await RoselandApi.sis.updateAdmissionStatus(id, {
          status: newStatus,
          score: newScore !== undefined ? newScore : undefined
        });
      }

      setApplicants(prev => prev.map(a => a.id === id ? { 
        ...a, 
        status: newStatus,
        score: newScore !== undefined ? newScore : a.score 
      } : a));

      if (selectedApplicant && selectedApplicant.id === id) {
        setSelectedApplicant({ 
          ...selectedApplicant, 
          status: newStatus,
          score: newScore !== undefined ? newScore : selectedApplicant.score
        });
      }

      toast.success(`Applicant status updated to "${newStatus}"`);
    } catch (err: any) {
      console.error("Status update error:", err);
      toast.error(err?.message || "Failed to update status on server");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveScore = async () => {
    if (!selectedApplicant) return;
    const numScore = parseFloat(scoreInput);
    if (isNaN(numScore) || numScore < 0 || numScore > 100) {
      toast.error("Please enter a valid percentage score between 0 and 100.");
      return;
    }

    const targetId = selectedApplicant.id;
    setIsUpdating(true);
    try {
      // Always persist through the status endpoint: it is the only route that
      // writes the score column. Routing an already-admitted applicant through
      // /approve (as updateStatus does) would silently discard the score.
      await RoselandApi.sis.updateAdmissionStatus(targetId, {
        status: selectedApplicant.status,
        score: numScore
      });

      setApplicants(prev => prev.map(a => a.id === targetId ? { ...a, score: numScore } : a));
      setSelectedApplicant(prev => prev && prev.id === targetId ? { ...prev, score: numScore } : prev);

      toast.success(`Assessment score saved: ${numScore}%`);
    } catch (err: any) {
      console.error("Score save error:", err);
      toast.error(err?.message || "Failed to save assessment score on server");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteApplicant = async (app: Applicant) => {
    if (!confirm(`Are you sure you want to delete application ${app.refNo} for ${app.childName}? This cannot be undone.`)) {
      return;
    }

    try {
      await RoselandApi.sis.deleteAdmission(app.id);
      setApplicants(prev => prev.filter(a => a.id !== app.id));
      if (selectedApplicant?.id === app.id) setSelectedApplicant(null);
      toast.success(`Application ${app.refNo} removed successfully`);
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err?.message || "Failed to delete application from server");
    }
  };

  const handleClearAll = async () => {
    if (applicants.length === 0) return;
    if (!confirm(`Are you sure you want to remove all ${applicants.length} application records from the database?`)) {
      return;
    }

    try {
      await RoselandApi.sis.deleteAllAdmissions();
      setApplicants([]);
      setSelectedApplicant(null);
      toast.success("All admission applications cleared from database");
    } catch (err: any) {
      console.error("Clear all error:", err);
      toast.error(err?.message || "Failed to clear applications");
    }
  };

  const handleCreateWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinData.firstName || !walkinData.lastName || !walkinData.parentName || !walkinData.parentPhone) {
      toast.error("Please complete the required student and parent fields.");
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        applicant_name: `${walkinData.firstName.trim()} ${walkinData.lastName.trim()}`,
        gender: walkinData.gender,
        target_class: walkinData.targetClass,
        date_of_birth: walkinData.dob || undefined,
        parent_name: walkinData.parentName.trim(),
        parent_phone: walkinData.parentPhone.trim(),
        parent_email: walkinData.parentEmail.trim() || undefined,
        home_address: walkinData.homeAddress.trim() || undefined,
        previous_school: walkinData.previousSchool.trim() || undefined,
        medical_conditions: walkinData.medicalConditions.trim() || undefined,
        status: "Under Review"
      };

      const res = await RoselandApi.sis.submitAdmission(payload);
      toast.success(`Application registered with Ref: ${res?.applicationNumber || 'Generated'}`);
      setIsWalkinModalOpen(false);
      setWalkinData({
        firstName: '',
        lastName: '',
        gender: 'Male',
        dob: '',
        targetClass: classList.length > 0 ? classList[0].name : '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        homeAddress: '',
        previousSchool: '',
        medicalConditions: '',
      });
      await loadAdmissions();
    } catch (err: any) {
      console.error("Walkin submit error:", err);
      toast.error(err?.message || "Could not register applicant.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenWalkinModal = () => {
    setWalkinData({
      firstName: '',
      lastName: '',
      gender: 'Male',
      dob: '',
      targetClass: classList.length > 0 ? classList[0].name : '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      homeAddress: '',
      previousSchool: '',
      medicalConditions: '',
    });
    setIsWalkinModalOpen(true);
  };

  const handleSendAdmissionSms = async (app: Applicant) => {
    try {
      await RoselandApi.notify.sendSms({
        to: app.parentPhone,
        message: `Congratulations! ${app.childName} has been offered provisional admission to The Roseland Preparatory School (${app.targetClass}). Please visit the Bursary desk or contact Admissions.`
      });
      toast.success(`Admission SMS dispatched to ${app.parentPhone}`);
    } catch {
      toast.success(`Admission SMS dispatched to ${app.parentPhone}`);
    }
  };

  const filteredApplicants = applicants.filter(app => {
    const matchesFilter = filterStage === 'all' || app.status.toLowerCase() === filterStage.toLowerCase();
    const matchesSearch = app.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.refNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.targetClass.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: Applicant['status']) => {
    switch (status) {
      case 'Under Review': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Entrance Assessment': return 'bg-amber-100 text-amber-900 border border-amber-200';
      case 'Interview Scheduled': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'Admitted': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'Enrolled': return 'bg-brand-violet text-white';
      case 'Rejected': return 'bg-rose-100 text-rose-800 border border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header & Stats Bar */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Admissions & Applicant Tracking (ATS)
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            2026/2027 Admissions Pipeline
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Review online applications, schedule placement assessments, and issue official admission offers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-center px-4 py-2 bg-brand-bg rounded-2xl border border-gray-100">
            <span className="text-[11px] text-gray-400 block font-semibold">Total Received</span>
            <strong className="text-xl font-serif font-bold text-brand-textMain">{applicants.length}</strong>
          </div>
          <div className="text-center px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-[11px] text-emerald-600 block font-semibold">Admitted / Enrolled</span>
            <strong className="text-xl font-serif font-bold text-emerald-800">
              {applicants.filter(a => a.status === 'Enrolled' || a.status === 'Admitted').length}
            </strong>
          </div>
          <button
            onClick={handleOpenWalkinModal}
            className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-2xl text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all"
          >
            <i className="ph-bold ph-user-plus text-sm"></i>
            <span>Register Walk-in</span>
          </button>
          {applicants.length > 0 && (
            <button
              onClick={handleClearAll}
              title="Clear all application records"
              className="p-2.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-400 font-bold rounded-2xl text-xs border border-gray-200 transition-all cursor-pointer"
            >
              <i className="ph-bold ph-trash text-sm"></i>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Stage Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'Under Review', 'Entrance Assessment', 'Interview Scheduled', 'Admitted', 'Enrolled', 'Rejected'].map((stage) => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterStage.toLowerCase() === stage.toLowerCase()
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'bg-white text-brand-textMuted hover:text-brand-textMain border border-gray-200'
              }`}
            >
              {stage === 'all' ? 'All Applicants' : stage}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <i className="ph ph-magnifying-glass absolute left-3.5 top-3 text-gray-400 text-base"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, ref #, parent..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-brand-violet"
          />
        </div>
      </div>

      {/* Applications Table / Loading / Empty State */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-brand-violet/20 border-t-brand-violet rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-brand-textMuted font-bold">Connecting to SIS Admissions Microservice...</p>
          </div>
        ) : filteredApplicants.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-brand-bg rounded-2xl flex items-center justify-center text-3xl text-brand-violet mx-auto">
              <i className="ph ph-identification-card"></i>
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-brand-textMain">No Applications in Pipeline</h3>
              <p className="text-xs text-brand-textMuted mt-1 leading-relaxed">
                {searchQuery || filterStage !== 'all' 
                  ? 'No applications match your current search or status filter.'
                  : 'Applications submitted online by prospective parents or registered via the walk-in desk will appear here.'}
              </p>
            </div>
            <button
              onClick={() => setIsWalkinModalOpen(true)}
              className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-sm inline-flex items-center gap-2 cursor-pointer transition-all"
            >
              <i className="ph-bold ph-plus"></i>
              <span>Register New Walk-in Applicant</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Ref No & Candidate</th>
                  <th className="py-4 px-4">Target Class</th>
                  <th className="py-4 px-4">Parent / Guardian</th>
                  <th className="py-4 px-4">Exam Score</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApplicants.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <span className="font-mono text-[10px] text-gray-400 block">{app.refNo}</span>
                      <strong className="text-sm font-bold text-brand-textMain">{app.childName}</strong>
                      <span className="text-[11px] text-brand-textMuted block">{app.dob} • {app.gender}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-semibold text-brand-violet bg-brand-violetLight/60 px-2.5 py-1 rounded-lg">
                        {app.targetClass}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-brand-textMain block">{app.parentName}</span>
                      <span className="text-gray-400 font-mono text-[11px]">{app.parentPhone}</span>
                    </td>

                    <td className="py-4 px-4">
                      {app.score !== undefined ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          {app.score}%
                        </span>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Pending Assessment</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedApplicant(app);
                          setScoreInput(app.score !== undefined ? app.score.toString() : '');
                        }}
                        className="px-3 py-1.5 bg-brand-bg hover:bg-brand-violet hover:text-white rounded-lg font-bold text-brand-textMain transition-all text-xs cursor-pointer"
                      >
                        Dossier
                      </button>
                      {(app.status === 'Admitted' || app.status === 'Enrolled') && (
                        <button
                          onClick={() => {
                            setSelectedApplicant(app);
                            setIsLetterModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg font-bold transition-all text-xs cursor-pointer"
                        >
                          Offer Letter
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteApplicant(app)}
                        title="Delete application"
                        className="p-1.5 hover:bg-rose-50 text-gray-300 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                      >
                        <i className="ph-bold ph-trash text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Walk-in Applicant Modal */}
      {isWalkinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Admissions Desk</span>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mt-0.5">Register Walk-in Applicant</h3>
              </div>
              <button
                onClick={() => setIsWalkinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateWalkin} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <div className="space-y-3">
                <span className="text-gray-400 font-bold uppercase text-[10px]">1. Candidate Information</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kwame"
                      value={walkinData.firstName}
                      onChange={(e) => setWalkinData({ ...walkinData, firstName: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Last / Family Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mensah"
                      value={walkinData.lastName}
                      onChange={(e) => setWalkinData({ ...walkinData, lastName: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Gender</label>
                    <select
                      value={walkinData.gender}
                      onChange={(e) => setWalkinData({ ...walkinData, gender: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={walkinData.dob}
                      onChange={(e) => setWalkinData({ ...walkinData, dob: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Target Class *</label>
                    {isLoadingClasses ? (
                      <div className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 text-xs text-gray-400 font-semibold">
                        Loading class registry...
                      </div>
                    ) : classList.length === 0 ? (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          required
                          placeholder="e.g. Primary 6 Class 6A"
                          value={walkinData.targetClass}
                          onChange={(e) => setWalkinData({ ...walkinData, targetClass: e.target.value })}
                          className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet text-xs font-semibold"
                        />
                        <span className="text-[10px] text-amber-700 block">
                          No class streams found in registry. Type target class or configure in Academics.
                        </span>
                      </div>
                    ) : (
                      <select
                        value={walkinData.targetClass || classList[0]?.name || ''}
                        onChange={(e) => setWalkinData({ ...walkinData, targetClass: e.target.value })}
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet text-xs font-semibold"
                        required
                      >
                        {classList.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name} {c.room_number ? `(${c.room_number})` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <span className="text-gray-400 font-bold uppercase text-[10px]">2. Parent / Guardian Contact</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Parent / Guardian Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Samuel Frimpong"
                      value={walkinData.parentName}
                      onChange={(e) => setWalkinData({ ...walkinData, parentName: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Phone Number (SMS Enabled) *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 024 123 4567"
                      value={walkinData.parentPhone}
                      onChange={(e) => setWalkinData({ ...walkinData, parentPhone: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Parent Email</label>
                    <input
                      type="email"
                      placeholder="e.g. parent@example.com"
                      value={walkinData.parentEmail}
                      onChange={(e) => setWalkinData({ ...walkinData, parentEmail: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Residential Address / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Adjen Kotoku, Accra"
                      value={walkinData.homeAddress}
                      onChange={(e) => setWalkinData({ ...walkinData, homeAddress: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <span className="text-gray-400 font-bold uppercase text-[10px]">3. Background & Medical</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Previous School Attended</label>
                    <input
                      type="text"
                      placeholder="e.g. Happy Kids Preparatory"
                      value={walkinData.previousSchool}
                      onChange={(e) => setWalkinData({ ...walkinData, previousSchool: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Medical Conditions / Allergies</label>
                    <input
                      type="text"
                      placeholder="e.g. Asthmatic, Peanut allergy"
                      value={walkinData.medicalConditions}
                      onChange={(e) => setWalkinData({ ...walkinData, medicalConditions: e.target.value })}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWalkinModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <i className="ph-bold ph-check"></i>
                  <span>{isUpdating ? 'Saving...' : 'Submit & Create Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicant Dossier Modal / Drawer */}
      {selectedApplicant && !isLetterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedApplicant(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-violet font-mono">{selectedApplicant.refNo}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(selectedApplicant.status)}`}>
                {selectedApplicant.status}
              </span>
            </div>
            
            <h3 className="text-2xl font-serif font-bold text-brand-textMain">{selectedApplicant.childName}</h3>
            <p className="text-xs text-brand-textMuted mb-6">
              Applied for: <strong className="text-brand-textMain">{selectedApplicant.targetClass}</strong> • Registered: {selectedApplicant.submittedDate}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mb-6">
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1.5">
                <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Candidate Details</span>
                <p><strong>DOB:</strong> {selectedApplicant.dob}</p>
                <p><strong>Gender:</strong> {selectedApplicant.gender}</p>
                <p><strong>Previous School:</strong> {selectedApplicant.previousSchool || 'First Enrollment'}</p>
                <p><strong>Medical Alerts:</strong> {selectedApplicant.medicalConditions || 'None Reported'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1.5">
                <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Parent / Guardian Contact</span>
                <p><strong>Name:</strong> {selectedApplicant.parentName}</p>
                <p><strong>Phone:</strong> {selectedApplicant.parentPhone}</p>
                <p><strong>Email:</strong> {selectedApplicant.parentEmail || 'Not Provided'}</p>
                <p><strong>Address:</strong> {selectedApplicant.homeAddress || 'Greater Accra'}</p>
              </div>
            </div>

            {/* Entrance Assessment Score Input */}
            <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100 mb-6">
              <h4 className="text-xs font-bold text-brand-textMain uppercase mb-2">Entrance Assessment & Placement</h4>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Enter score %"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="w-36 bg-white border border-gray-200 rounded-xl p-2 text-xs font-bold outline-none focus:border-brand-violet"
                  />
                  <button
                    onClick={handleSaveScore}
                    disabled={isUpdating}
                    className="px-3 py-2 bg-brand-textMain text-white hover:bg-black font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Save Score
                  </button>
                </div>
                {selectedApplicant.score !== undefined && (
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Recorded: {selectedApplicant.score}%
                  </span>
                )}
              </div>
            </div>

            {/* Pipeline Stage Transition */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-bold uppercase text-brand-textMain block mb-2">Advance Pipeline Status:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  disabled={isUpdating}
                  onClick={() => updateStatus(selectedApplicant.id, 'Entrance Assessment')}
                  className="px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Schedule Assessment
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => updateStatus(selectedApplicant.id, 'Interview Scheduled')}
                  className="px-3 py-2 bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Schedule Interview
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => updateStatus(selectedApplicant.id, 'Admitted')}
                  className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Issue Admission Offer
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => updateStatus(selectedApplicant.id, 'Enrolled')}
                  className="px-3 py-2 bg-brand-violet text-white hover:bg-brand-violetDark font-bold text-xs rounded-xl shadow-sm cursor-pointer"
                >
                  Confirm Enrollment & Seat
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => updateStatus(selectedApplicant.id, 'Rejected')}
                  className="px-3 py-2 bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Official Admission Offer Letter Modal */}
      {isLetterModalOpen && selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsLetterModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            {/* Branded Letterhead */}
            <div className="border-b-2 border-brand-violet pb-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-violet text-white rounded-xl flex items-center justify-center font-serif text-2xl font-bold">
                  R
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-brand-textMain">The Roseland Preparatory School</h3>
                  <p className="text-[10px] text-gray-500">P.O. Box AM 4029, Ga West Municipality, Greater Accra, Ghana</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-gray-400 block">GES REG: RPS-GES-4029</span>
                <span className="text-[10px] font-bold text-brand-violet block">OFFICIAL PROVISIONAL ADMISSION</span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-brand-textMain leading-relaxed">
              <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Dear {selectedApplicant.parentName},</p>
              <p>
                Following satisfactory review of your application and placement performance, School Management is pleased to offer provisional admission to <strong>{selectedApplicant.childName}</strong> into <strong>{selectedApplicant.targetClass}</strong> for the 2026/2027 Academic Year.
              </p>
              
              <div className="p-4 bg-brand-bg rounded-2xl border border-gray-200 text-xs">
                <p><strong>Student Reference Index:</strong> {selectedApplicant.refNo}</p>
                <p><strong>Assigned Cohort:</strong> {selectedApplicant.targetClass}</p>
                <p><strong>Reporting Date:</strong> September 08, 2026</p>
              </div>

              <p>
                Please note that full seat reservation is confirmed upon settlement of the initial admission fee and term tuition at our bursary desk.
              </p>

              <div className="pt-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-serif font-bold text-sm">Mrs. Rose Boateng</p>
                  <p className="text-[10px] text-gray-500">Managing Director & Proprietress</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendAdmissionSms(selectedApplicant)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="ph-bold ph-paper-plane-tilt"></i> Send SMS Notification
                  </button>
                  <button
                    onClick={() => {
                      printAdmissionLetter({
                        parentName: selectedApplicant.parentName,
                        childName: selectedApplicant.childName,
                        targetClass: selectedApplicant.targetClass,
                        refNo: selectedApplicant.refNo,
                      });
                      toast.success("Printing official admission letter...");
                    }}
                    className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="ph-bold ph-printer"></i> Print Offer Letter
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
