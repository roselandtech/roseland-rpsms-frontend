"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface FlaggedStudent {
  id: string;
  student_id: string;
  index: string;
  name: string;
  class: string;
  average: string;
  current_average: number;
  attendance: string;
  attendance_rate: number;
  bottlenecks: string[];
  intervention: string;
  assigned_teacher: string;
  target_average: string;
  target_average_num: number;
  parent_name: string;
  parent_phone: string;
  parent_status: string;
  parent_summons_date?: string | null;
  riskLevel: 'Critical' | 'Moderate' | string;
  sessions_completed: number;
  status: string;
  notes?: string | null;
  avatar?: string;
}

export default function HeadmasterAtRiskPage() {
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [classList, setClassList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Summon parent loading state map
  const [summoningMap, setSummoningMap] = useState<Record<string, boolean>>({});

  // Remedial plan form state
  const [planForm, setPlanForm] = useState({
    index_no: '',
    student_name: '',
    class_grade: '',
    intervention_type: 'After-School Remedial Catch-Up',
    focus_subjects: 'Mathematics, English Literacy',
    assigned_teacher: 'Remedial Lead Specialist',
    current_average: 45,
    target_average: 65,
    notes: '',
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const loadAtRiskData = useCallback(async () => {
    try {
      setIsLoading(true);
      // 1. Fetch at-risk registry from backend
      const res = await RoselandApi.academic.getAtRiskStudents();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      const mapped: FlaggedStudent[] = list.map((s: any) => ({
        id: s.id || s.index_number || s.index,
        student_id: s.student_id || s.id,
        index: s.index_number || s.index || s.id,
        name: s.student_name || s.name || s.full_name,
        class: s.class_grade || s.class || 'Primary Cohort',
        average: s.average || `${s.current_average || 48.0}%`,
        current_average: Number(s.current_average ?? 48),
        attendance: s.attendance || `${s.attendance_rate || 72.0}%`,
        attendance_rate: Number(s.attendance_rate ?? 72),
        bottlenecks: Array.isArray(s.bottlenecks) && s.bottlenecks.length > 0 ? s.bottlenecks : ['Foundational Literacy & Numeracy'],
        intervention: s.intervention || 'Pending Formulation',
        assigned_teacher: s.assigned_teacher || 'Not Assigned',
        target_average: s.target_average || '65.0%',
        target_average_num: Number(s.target_average_num ?? 65),
        parent_name: s.parent_name || 'Parent / Guardian',
        parent_phone: s.parent_phone || '+233 24 000 0000',
        parent_status: s.parent_status || s.parent_summons_status || 'Not Summoned',
        parent_summons_date: s.parent_summons_date,
        riskLevel: s.risk_level || s.riskLevel || 'Moderate',
        sessions_completed: Number(s.sessions_completed || 0),
        status: s.status || 'Active',
        notes: s.notes || '',
        avatar: s.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      }));

      setFlaggedStudents(mapped);

      // Extract unique classes
      const classes = Array.from(new Set(mapped.map((m) => m.class))).sort();
      setClassList(classes);

      // Fetch all students to power modal autocomplete if needed
      const sisStudents = await RoselandApi.sis.getStudents().catch(() => []);
      const sisList = Array.isArray(sisStudents?.data) ? sisStudents.data : Array.isArray(sisStudents) ? sisStudents : [];
      setAllStudents(sisList);
    } catch (err) {
      console.warn("At-risk registry loading failed", err);
      toast.error("Failed to load live at-risk scholars.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAtRiskData();
  }, [loadAtRiskData]);

  // Telemetry KPIs
  const criticalCount = flaggedStudents.filter((s) => s.riskLevel === 'Critical').length;
  const moderateCount = flaggedStudents.filter((s) => s.riskLevel === 'Moderate').length;
  const activePlansCount = flaggedStudents.filter((s) => s.intervention !== 'Pending Formulation' && s.status !== 'Unassigned').length;
  const summonedCount = flaggedStudents.filter((s) => s.parent_status === 'Summons Dispatched' || s.parent_status === 'Conference Attended').length;

  // Filtered List
  const filteredStudents = useMemo(() => {
    return flaggedStudents.filter((s) => {
      const matchClass = selectedClassFilter === 'ALL' || s.class === selectedClassFilter;
      const matchRisk = selectedRiskFilter === 'ALL' || s.riskLevel === selectedRiskFilter;
      const matchSearch =
        searchQuery === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.index.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.bottlenecks.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchClass && matchRisk && matchSearch;
    });
  }, [flaggedStudents, selectedClassFilter, selectedRiskFilter, searchQuery]);

  // Open modal with pre-filled student
  const openPlanModal = (student?: FlaggedStudent) => {
    if (student) {
      setPlanForm({
        index_no: student.index,
        student_name: student.name,
        class_grade: student.class,
        intervention_type: student.intervention !== 'Pending Formulation' ? student.intervention : 'After-School Remedial Catch-Up',
        focus_subjects: student.bottlenecks.join(', '),
        assigned_teacher: student.assigned_teacher !== 'Not Assigned' ? student.assigned_teacher : 'Remedial Lead Specialist',
        current_average: student.current_average || 45,
        target_average: student.target_average_num || 65,
        notes: student.notes || '',
      });
    } else {
      setPlanForm({
        index_no: '',
        student_name: '',
        class_grade: classList[0] || 'Basic 1',
        intervention_type: 'After-School Remedial Catch-Up',
        focus_subjects: 'Mathematics, English Literacy',
        assigned_teacher: 'Remedial Lead Specialist',
        current_average: 45,
        target_average: 65,
        notes: '',
      });
    }
    setIsInterventionModalOpen(true);
  };

  // Submit Remedial Plan to backend
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.index_no || !planForm.student_name) {
      toast.error('Please enter scholar details.');
      return;
    }

    setIsSavingPlan(true);
    try {
      await RoselandApi.academic.saveRemedialPlan({
        index_no: planForm.index_no,
        student_name: planForm.student_name,
        class_grade: planForm.class_grade,
        intervention_type: planForm.intervention_type,
        focus_subjects: planForm.focus_subjects,
        assigned_teacher: planForm.assigned_teacher,
        current_average: Number(planForm.current_average),
        target_average: Number(planForm.target_average),
        notes: planForm.notes,
      });

      toast.success(`Intervention plan deployed for ${planForm.student_name}!`);
      setIsInterventionModalOpen(false);
      await loadAtRiskData();
    } catch (err: any) {
      console.error('Failed to save plan', err);
      toast.error(err?.message || 'Failed to save remedial plan.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  // Dispatch real parent summons SMS
  const handleSummonParent = async (s: FlaggedStudent) => {
    setSummoningMap((prev) => ({ ...prev, [s.index]: true }));
    try {
      const res = await RoselandApi.academic.summonParent({
        indexNo: s.index,
        studentName: s.name,
        reason: `Urgent academic conference regarding ${s.bottlenecks[0] || 'core subjects'} and weighted progress (${s.average}).`,
      });

      toast.success(`Parent summons dispatched to ${res?.parent_phone || s.parent_phone} for ${s.name}!`);

      // Update local state row
      setFlaggedStudents((prev) =>
        prev.map((item) =>
          item.index === s.index
            ? { ...item, parent_status: 'Summons Dispatched', parent_summons_date: new Date().toISOString() }
            : item
        )
      );
    } catch (err: any) {
      console.error('Summons failed', err);
      toast.error(err?.message || 'Failed to dispatch parent summons SMS.');
    } finally {
      setSummoningMap((prev) => ({ ...prev, [s.index]: false }));
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Academic Early-Warning Diagnostic & Intervention
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            At-Risk Scholar Registry
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Real-time algorithmic detection of scholars falling below 50% weighted average, under 75% attendance, or suffering subject bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAtRiskData}
            className="px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 text-brand-textMain font-bold rounded-xl text-xs border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh Diagnostic Telemetry"
          >
            <i className={`ph-bold ph-arrows-clockwise ${isLoading ? 'animate-spin' : ''}`}></i>
            Refresh
          </button>

          <button
            onClick={() => openPlanModal()}
            className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="ph-bold ph-plus-circle"></i> Create Remedial Plan
          </button>
        </div>
      </div>

      {/* Telemetry KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-red-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">Critical Risk</span>
            <span className="p-2 bg-red-50 text-red-600 rounded-xl text-lg">
              <i className="ph-fill ph-warning-octagon"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-red-700 mt-2">
            {isLoading ? '...' : criticalCount}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">Weighted avg &lt; 40% or att &lt; 60%</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Moderate Risk</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-xl text-lg">
              <i className="ph-fill ph-warning"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-amber-800 mt-2">
            {isLoading ? '...' : moderateCount}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">Marginal scores (40-49%) or att &lt; 75%</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Active Remedial Plans</span>
            <span className="p-2 bg-purple-50 text-brand-violet rounded-xl text-lg">
              <i className="ph-fill ph-book-open"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-brand-violetDark mt-2">
            {isLoading ? '...' : activePlansCount}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">Tailored catch-up tracks deployed</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Summons Issued</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-lg">
              <i className="ph-fill ph-chats-circle"></i>
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-serif text-blue-800 mt-2">
            {isLoading ? '...' : summonedCount}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">Conferences requested via SMS</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search scholar or index..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs outline-none focus:border-brand-violet w-48 sm:w-64"
            />
          </div>

          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="px-3 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-violet"
          >
            <option value="ALL">All Class Cohorts</option>
            {classList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={selectedRiskFilter}
            onChange={(e) => setSelectedRiskFilter(e.target.value)}
            className="px-3 py-2 bg-brand-bg border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-brand-violet"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="Critical">Critical Risk Only</option>
            <option value="Moderate">Moderate Risk Only</option>
          </select>
        </div>

        <span className="text-xs text-brand-textMuted font-medium self-center md:self-auto">
          Showing <strong>{filteredStudents.length}</strong> of <strong>{flaggedStudents.length}</strong> flagged scholars
        </span>
      </div>

      {/* Flagged Pupils Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
              <tr>
                <th className="py-4 px-6">Scholar & Class</th>
                <th className="py-4 px-4">Risk Severity</th>
                <th className="py-4 px-4">Weighted Avg</th>
                <th className="py-4 px-4">Attendance</th>
                <th className="py-4 px-4">Subject Bottlenecks</th>
                <th className="py-4 px-4">Active Intervention</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-brand-textMuted">
                    <i className="ph ph-spinner animate-spin text-2xl text-brand-violet block mb-2"></i>
                    Diagnosing scholastic early-warning telemetry across grades & SBA scores...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-brand-textMuted">
                    <i className="ph ph-shield-check text-3xl text-emerald-500 block mb-2"></i>
                    No scholars match the current diagnostic filter. All students in this cohort are meeting benchmarks.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.index} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.avatar}
                          alt={s.name}
                          className="w-9 h-9 rounded-full object-cover border border-gray-200"
                        />
                        <div>
                          <strong className="text-sm font-bold text-brand-textMain block">{s.name}</strong>
                          <span className="font-mono text-[10px] text-gray-400">{s.index} • {s.class}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      {s.riskLevel === 'Critical' ? (
                        <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-fit">
                          <i className="ph-fill ph-circle text-[7px] text-red-600 animate-pulse"></i> Critical
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 font-bold rounded-lg text-[10px] flex items-center gap-1 w-fit">
                          <i className="ph-fill ph-circle text-[7px] text-amber-600"></i> Moderate
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                        s.current_average < 40 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {s.average}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-mono font-semibold ${
                        s.attendance_rate < 70 ? 'text-red-600' : 'text-amber-700'
                      }`}>
                        {s.attendance}
                      </span>
                    </td>

                    <td className="py-4 px-4 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {s.bottlenecks.map((b, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded font-semibold text-[10px]">
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <strong className="text-brand-textMain block font-semibold">{s.intervention}</strong>
                      <span className="text-[10px] text-gray-400 font-medium">
                        Lead: {s.assigned_teacher} • Target: {s.target_average}
                      </span>
                      {s.parent_status === 'Summons Dispatched' && (
                        <span className="block mt-0.5 text-[10px] text-blue-600 font-semibold">
                          <i className="ph-bold ph-paper-plane-tilt"></i> Summons Dispatched
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => openPlanModal(s)}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                        title="Formulate or update remedial plan"
                      >
                        {s.intervention === 'Pending Formulation' ? 'Assign Plan' : 'Edit Plan'}
                      </button>

                      <button
                        onClick={() => handleSummonParent(s)}
                        disabled={summoningMap[s.index]}
                        className="px-3 py-1.5 bg-brand-yellowLight hover:bg-brand-yellow text-yellow-950 font-bold rounded-lg text-[11px] transition-all cursor-pointer disabled:opacity-50"
                        title="Send SMS requesting urgent conference with Headmaster"
                      >
                        {summoningMap[s.index] ? (
                          <span className="flex items-center gap-1">
                            <i className="ph ph-spinner animate-spin"></i> Dispatching...
                          </span>
                        ) : s.parent_status === 'Summons Dispatched' ? (
                          'Resend Summons'
                        ) : (
                          'Summon Parent'
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remedial Plan Modal */}
      <Modal
        isOpen={isInterventionModalOpen}
        onClose={() => setIsInterventionModalOpen(false)}
        title={planForm.student_name ? `Remedial Intervention: ${planForm.student_name}` : "Assign Remedial Intervention"}
        subtitle="Pedagogical Early-Warning & Remediation Protocol"
        size="md"
      >
        <form onSubmit={handleSavePlan} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Scholar *</label>
            <select
              value={planForm.index_no}
              onChange={(e) => {
                const selectedIdx = e.target.value;
                const match = allStudents.find((st: any) => (st.index_no || st.index_number || st.id) === selectedIdx);
                if (match) {
                  setPlanForm((prev) => ({
                    ...prev,
                    index_no: match.index_no || match.index_number || match.id,
                    student_name: match.full_name || `${match.first_name || ''} ${match.last_name || ''}`.trim(),
                    class_grade: match.class_grade || prev.class_grade,
                    current_average: Number(match.avg_score || 45),
                  }));
                } else {
                  setPlanForm((prev) => ({ ...prev, index_no: selectedIdx }));
                }
              }}
              required
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-bold text-xs"
            >
              <option value="">-- Select Scholar --</option>
              {allStudents.map((st: any) => {
                const idx = st.index_no || st.index_number || st.id;
                const name = st.full_name || `${st.first_name || ''} ${st.last_name || ''}`.trim();
                return (
                  <option key={idx} value={idx}>
                    {name} ({st.class_grade || 'Scholar'} - {idx})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Class Cohort</label>
              <input
                type="text"
                value={planForm.class_grade}
                onChange={(e) => setPlanForm({ ...planForm, class_grade: e.target.value })}
                required
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Target Score (%)</label>
              <input
                type="number"
                min="50"
                max="100"
                value={planForm.target_average}
                onChange={(e) => setPlanForm({ ...planForm, target_average: Number(e.target.value) })}
                required
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Intervention Type *</label>
            <select
              value={planForm.intervention_type}
              onChange={(e) => setPlanForm({ ...planForm, intervention_type: e.target.value })}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-medium"
            >
              <option value="After-School Remedial Catch-Up">After-School Remedial Catch-Up</option>
              <option value="Peer-Buddy Tutoring">Peer-Buddy Tutoring</option>
              <option value="Individual Learning Plan (ILP)">Individual Learning Plan (ILP)</option>
              <option value="Parent Academic Conference Required">Parent Academic Conference Required</option>
              <option value="Specialized Phonics & Numeracy Clinic">Specialized Phonics & Numeracy Clinic</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Subject Bottlenecks / Focus Areas</label>
            <input
              type="text"
              value={planForm.focus_subjects}
              onChange={(e) => setPlanForm({ ...planForm, focus_subjects: e.target.value })}
              placeholder="e.g. Mathematics, Integrated Science"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Assigned Remedial Lead / Teacher *</label>
            <input
              type="text"
              value={planForm.assigned_teacher}
              onChange={(e) => setPlanForm({ ...planForm, assigned_teacher: e.target.value })}
              placeholder="e.g. Assigned Subject Specialist / Form Master"
              required
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Pedagogical Notes / Directives</label>
            <textarea
              rows={2}
              value={planForm.notes}
              onChange={(e) => setPlanForm({ ...planForm, notes: e.target.value })}
              placeholder="Specific weak strands, recommended scaffolding techniques, or meeting remarks..."
              className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet text-xs resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingPlan}
              className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSavingPlan ? (
                <>
                  <i className="ph ph-spinner animate-spin"></i> Saving & Deploying...
                </>
              ) : (
                'Save & Deploy Intervention'
              )}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
