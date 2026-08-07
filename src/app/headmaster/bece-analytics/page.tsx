"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

export default function HeadmasterBECEAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'candidates' | 'masterclasses'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [masterclasses, setMasterclasses] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [sisStudents, setSisStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Modals state
  const [isMasterclassModalOpen, setIsMasterclassModalOpen] = useState(false);
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Selected SIS Student for quick-fill in candidate modal
  const [selectedSisStudentId, setSelectedSisStudentId] = useState('');

  // Form states
  const [masterclassForm, setMasterclassForm] = useState({
    title: '',
    subject: '',
    facilitator: '',
    target_cohort: 'JHS 3 Candidates',
    scheduled_date: '',
    scheduled_time: '09:00 AM - 12:00 PM',
    clinic_focus: '',
    venue: 'Main Assembly Hall'
  });

  const [candidateForm, setCandidateForm] = useState({
    student_index_no: '',
    student_name: '',
    gender: 'Male',
    class_grade: 'JHS 3',
    target_shs_category_a: '',
    target_shs_category_b: '',
    waec_index_number: ''
  });

  const [scoreForm, setScoreForm] = useState({
    candidate_id: '',
    student_index_no: '',
    student_name: '',
    mock_series: 'Mock 1',
    subject: '',
    raw_score: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [analyticsRes, candidatesRes, masterclassesRes, subjectsRes, studentsRes] = await Promise.allSettled([
        RoselandApi.academic.getBeceMockAnalytics(),
        RoselandApi.academic.getBeceCandidates(),
        RoselandApi.academic.getBeceMasterclasses(),
        RoselandApi.academic.getSubjects({ is_active: true }),
        RoselandApi.sis.getStudents()
      ]);

      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      }
      if (candidatesRes.status === 'fulfilled') {
        const cList = Array.isArray(candidatesRes.value) ? candidatesRes.value : [];
        setCandidates(cList);
      }
      if (masterclassesRes.status === 'fulfilled') {
        const mList = Array.isArray(masterclassesRes.value) ? masterclassesRes.value : [];
        setMasterclasses(mList);
      }
      if (subjectsRes.status === 'fulfilled') {
        const sList = Array.isArray(subjectsRes.value) ? subjectsRes.value : [];
        setSubjectsList(sList);
      }
      if (studentsRes.status === 'fulfilled') {
        const rawStudents = studentsRes.value;
        const sList = Array.isArray(rawStudents)
          ? rawStudents
          : Array.isArray(rawStudents?.students)
          ? rawStudents.students
          : Array.isArray(rawStudents?.data)
          ? rawStudents.data
          : [];
        setSisStudents(sList);
      }
    } catch (err) {
      console.warn("Could not load BECE analytics data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter JHS 3 / Basic 9 pupils from live SIS roster
  const jhs3Pupils = useMemo(() => {
    return sisStudents.filter((s: any) => {
      const cls = (s.class_grade || s.grade || '').toString().toLowerCase().trim();
      return cls.includes('jhs 3') || cls.includes('jhs3') || cls.includes('basic 9') || cls.includes('b9');
    });
  }, [sisStudents]);

  // Map of existing registered candidate index numbers for quick lookup
  const registeredIndexSet = useMemo(() => {
    return new Set(candidates.map((c: any) => c.student_index_no));
  }, [candidates]);

  // Handle selecting a SIS student from the recommendation dropdown
  const handleSelectSisStudent = (studentId: string) => {
    setSelectedSisStudentId(studentId);
    if (!studentId) return;

    const student = jhs3Pupils.find((s: any) => (s.id || s.index_number || s.student_id) === studentId);
    if (student) {
      const fullName = student.first_name && student.last_name
        ? `${student.first_name} ${student.last_name}`
        : student.student_name || student.name || '';
      
      const indexNo = student.index_number || student.student_id || student.student_index_no || '';

      setCandidateForm((prev) => ({
        ...prev,
        student_index_no: indexNo,
        student_name: fullName,
        gender: student.gender || 'Male',
        class_grade: student.class_grade || 'JHS 3'
      }));
    }
  };

  // Handle selecting a registered candidate for scoring
  const handleSelectScoreCandidate = (candId: string) => {
    const candidate = candidates.find((c: any) => (c.id || c.student_index_no) === candId);
    if (candidate) {
      setScoreForm((prev) => ({
        ...prev,
        candidate_id: candId,
        student_index_no: candidate.student_index_no,
        student_name: candidate.student_name
      }));
    } else {
      setScoreForm((prev) => ({
        ...prev,
        candidate_id: '',
        student_index_no: '',
        student_name: ''
      }));
    }
  };

  // Auto-sync all un-enrolled JHS 3 pupils in one click
  const handleAutoSyncJhs3Roster = async () => {
    if (jhs3Pupils.length === 0) {
      toast.error("No JHS 3 / Basic 9 pupils found in the school SIS registry.");
      return;
    }

    const pendingPupils = jhs3Pupils.filter((s: any) => {
      const indexNo = s.index_number || s.student_id || s.student_index_no || '';
      return indexNo && !registeredIndexSet.has(indexNo);
    });

    if (pendingPupils.length === 0) {
      toast.success("All JHS 3 pupils from the SIS registry are already enrolled in the BECE cohort!");
      return;
    }

    try {
      setSyncing(true);
      const payload = pendingPupils.map((s: any) => ({
        student_index_no: s.index_number || s.student_id || s.student_index_no,
        student_name: s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.student_name || s.name || 'JHS 3 Pupil',
        gender: s.gender || 'Male',
        class_grade: s.class_grade || 'JHS 3'
      }));

      const res = await RoselandApi.academic.syncBeceCandidatesFromSis(payload);
      toast.success(`Successfully enrolled ${res.newlyEnrolled || payload.length} JHS 3 pupils from SIS!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to auto-sync JHS 3 pupils.");
    } finally {
      setSyncing(false);
    }
  };

  // Handlers
  const handleCreateMasterclass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterclassForm.title || !masterclassForm.subject || !masterclassForm.scheduled_date) {
      toast.error("Please fill in the title, subject, and scheduled date.");
      return;
    }

    try {
      setSubmitting(true);
      await RoselandApi.academic.createBeceMasterclass(masterclassForm);
      toast.success("BECE masterclass clinic scheduled successfully!");
      setIsMasterclassModalOpen(false);
      setMasterclassForm({
        title: '',
        subject: '',
        facilitator: '',
        target_cohort: 'JHS 3 Candidates',
        scheduled_date: '',
        scheduled_time: '09:00 AM - 12:00 PM',
        clinic_focus: '',
        venue: 'Main Assembly Hall'
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule masterclass.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMasterclass = async (id: string) => {
    if (!confirm("Are you sure you want to remove this masterclass clinic?")) return;
    try {
      await RoselandApi.academic.deleteBeceMasterclass(id);
      toast.success("Masterclass clinic removed.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove clinic.");
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateForm.student_index_no || !candidateForm.student_name) {
      toast.error("Please select or enter the candidate's index number and full name.");
      return;
    }

    try {
      setSubmitting(true);
      await RoselandApi.academic.createBeceCandidate(candidateForm);
      toast.success(`Candidate ${candidateForm.student_name} registered successfully!`);
      setIsCandidateModalOpen(false);
      setSelectedSisStudentId('');
      setCandidateForm({
        student_index_no: '',
        student_name: '',
        gender: 'Male',
        class_grade: 'JHS 3',
        target_shs_category_a: '',
        target_shs_category_b: '',
        waec_index_number: ''
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to register candidate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove candidate ${name}?`)) return;
    try {
      await RoselandApi.academic.deleteBeceCandidate(id);
      toast.success("Candidate removed.");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove candidate.");
    }
  };

  const handleRecordScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scoreForm.student_index_no || !scoreForm.subject || scoreForm.raw_score === '') {
      toast.error("Please select a candidate, subject, and enter raw score.");
      return;
    }

    const scoreNum = parseFloat(scoreForm.raw_score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("Raw score must be a number between 0 and 100.");
      return;
    }

    try {
      setSubmitting(true);
      await RoselandApi.academic.recordBeceMockScore({
        student_index_no: scoreForm.student_index_no,
        student_name: scoreForm.student_name || scoreForm.student_index_no,
        mock_series: scoreForm.mock_series,
        subject: scoreForm.subject,
        raw_score: scoreNum
      });
      toast.success(`Score of ${scoreNum}% recorded for ${scoreForm.student_name} in ${scoreForm.subject}!`);
      setIsScoreModalOpen(false);
      setScoreForm({
        candidate_id: '',
        student_index_no: '',
        student_name: '',
        mock_series: 'Mock 1',
        subject: '',
        raw_score: ''
      });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record score.");
    } finally {
      setSubmitting(false);
    }
  };

  const comparisons = analytics?.mockComparison || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-700 block mb-1">
            WAEC / BECE Examination Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            JHS 3 BECE Mock Predictive Analytics
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Track Stanine Grade trajectories across Mock series and project aggregate 6–10 distinction rates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsScoreModalOpen(true)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="ph-bold ph-pencil-simple-line"></i> Record Mock Score
          </button>
          <button
            onClick={() => {
              setSelectedSisStudentId('');
              setIsCandidateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-50 text-purple-700 font-bold rounded-xl text-xs hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="ph-bold ph-user-plus"></i> Enrol Candidate
          </button>
          <button
            onClick={() => setIsMasterclassModalOpen(true)}
            className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <i className="ph-bold ph-calendar-plus"></i> Schedule Masterclass
          </button>
        </div>
      </div>

      {/* Cohort KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Candidate Cohort</span>
          <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-1">
            {candidates.length} Candidates
          </h3>
          <span className="text-xs text-brand-violet font-semibold">
            {candidates.length > 0 ? `${candidates.length} Registered in JHS 3` : "Awaiting candidate enrolment"}
          </span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Projected Distinction Rate</span>
          <h3 className="text-2xl font-serif font-bold text-emerald-600 mt-1">
            {analytics?.aggregateDistinctionRate || "0%"}
          </h3>
          <span className="text-xs text-brand-textMuted font-semibold">
            {analytics?.projectedDistinctions ? `${analytics.projectedDistinctions} Distinction candidates` : "Based on mock marks"}
          </span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Series</span>
          <h3 className="text-2xl font-serif font-bold text-purple-700 mt-1">
            {analytics?.currentMock || "Mock Series"}
          </h3>
          <span className="text-xs text-gray-500 font-semibold">National WAEC Standard</span>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Masterclass Clinics</span>
          <h3 className="text-2xl font-serif font-bold text-amber-700 mt-1">
            {masterclasses.length} Scheduled
          </h3>
          <span className="text-xs text-brand-textMuted font-semibold">Weekend Intensives</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'overview'
              ? 'border-brand-violet text-brand-violet'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <i className="ph ph-chart-line-up mr-2"></i> Subject Trajectories
        </button>
        <button
          onClick={() => setActiveTab('candidates')}
          className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'candidates'
              ? 'border-brand-violet text-brand-violet'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <i className="ph ph-users-three mr-2"></i> Candidate Cohort ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('masterclasses')}
          className={`py-3 px-6 text-sm font-bold border-b-2 cursor-pointer transition-all ${
            activeTab === 'masterclasses'
              ? 'border-brand-violet text-brand-violet'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <i className="ph ph-calendar-check mr-2"></i> Masterclasses ({masterclasses.length})
        </button>
      </div>

      {/* Tab 1: Subject Trajectory Table */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Subject-by-Subject Mock Growth Trajectory</h3>
              <p className="text-xs text-gray-400 mt-0.5">Mock 1 vs Mock 2/3 performance averages and projected Stanine grades</p>
            </div>
            <span className="text-xs text-gray-400 font-mono">Live Computed SBA</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">BECE Subject</th>
                  <th className="py-4 px-4">Mock I Mean</th>
                  <th className="py-4 px-4">Mock II Mean</th>
                  <th className="py-4 px-4">Growth Gain</th>
                  <th className="py-4 px-6 text-right">Projected Stanine Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                      <i className="ph ph-spinner animate-spin text-xl text-brand-violet block mb-2 mx-auto"></i>
                      Computing mock analytics...
                    </td>
                  </tr>
                ) : comparisons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-purple-50 text-brand-violet flex items-center justify-center mx-auto text-xl">
                          <i className="ph ph-chart-bar"></i>
                        </div>
                        <h4 className="text-sm font-bold text-brand-textMain">No Mock Examination Scores Recorded Yet</h4>
                        <p className="text-xs text-brand-textMuted">
                          Record student mock exam marks using the button above to calculate subject mean averages, Stanine projections, and distinction trajectories.
                        </p>
                        <button
                          onClick={() => setIsScoreModalOpen(true)}
                          className="px-4 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm cursor-pointer"
                        >
                          Record First Score
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  comparisons.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <strong className="text-sm font-bold text-brand-textMain">{s.subject}</strong>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-mono text-gray-600">{s.mock1Average}%</span>
                      </td>

                      <td className="py-4 px-4">
                        <strong className="font-mono font-bold text-brand-textMain">{s.mock2Average}%</strong>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                          s.delta.startsWith('+') ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                        }`}>
                          {s.delta}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          s.status === 'EXEMPLARY' ? 'bg-emerald-100 text-emerald-800' :
                          s.status === 'ATTENTION_REQUIRED' ? 'bg-amber-100 text-amber-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {s.projectedStanine}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Candidate Roster */}
      {activeTab === 'candidates' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Registered JHS 3 BECE Candidates</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {candidates.length} Candidates Enrolled • {jhs3Pupils.length} JHS 3 Pupils in SIS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAutoSyncJhs3Roster}
                disabled={syncing}
                className="px-3.5 py-2 bg-purple-50 text-purple-700 font-bold rounded-xl text-xs hover:bg-purple-100 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Automatically enrol all JHS 3 pupils from the SIS into BECE candidate cohort"
              >
                <i className={`ph-bold ${syncing ? 'ph-spinner animate-spin' : 'ph-arrows-clockwise'}`}></i>
                {syncing ? 'Syncing Roster...' : 'Auto-Sync JHS 3 Pupils'}
              </button>
              <button
                onClick={() => {
                  setSelectedSisStudentId('');
                  setIsCandidateModalOpen(true);
                }}
                className="px-3.5 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <i className="ph-bold ph-plus"></i> Enrol Candidate
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Candidate</th>
                  <th className="py-4 px-4">Index / WAEC ID</th>
                  <th className="py-4 px-4">Target SHS (Category A)</th>
                  <th className="py-4 px-4">Target SHS (Category B)</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                      <i className="ph ph-spinner animate-spin text-xl text-brand-violet block mb-2 mx-auto"></i>
                      Loading candidates...
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-purple-50 text-brand-violet flex items-center justify-center mx-auto text-xl">
                          <i className="ph ph-users"></i>
                        </div>
                        <h4 className="text-sm font-bold text-brand-textMain">No Candidates Enrolled Yet</h4>
                        <p className="text-xs text-brand-textMuted">
                          Register JHS 3 candidates individually or auto-sync all JHS 3 pupils from the live school registry in one click.
                        </p>
                        <div className="flex justify-center gap-2 pt-2">
                          <button
                            onClick={handleAutoSyncJhs3Roster}
                            className="px-4 py-2 bg-purple-50 text-purple-700 font-bold rounded-xl text-xs hover:bg-purple-100 cursor-pointer flex items-center gap-1.5"
                          >
                            <i className="ph-bold ph-arrows-clockwise"></i> Auto-Sync from SIS
                          </button>
                          <button
                            onClick={() => {
                              setSelectedSisStudentId('');
                              setIsCandidateModalOpen(true);
                            }}
                            className="px-4 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm cursor-pointer"
                          >
                            Enrol Candidate
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidates.map((c: any) => (
                    <tr key={c.id || c.student_index_no} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-sm text-brand-textMain">{c.student_name}</div>
                        <span className="text-[10px] text-gray-400 font-medium">{c.gender || "JHS 3 Pupil"}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-mono text-gray-700 font-semibold">{c.student_index_no}</span>
                        {c.waec_index_number && (
                          <div className="text-[10px] text-purple-700 font-mono">WAEC: {c.waec_index_number}</div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-xs text-brand-textMain font-medium">{c.target_shs_category_a || "Not Selected"}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-xs text-brand-textMuted">{c.target_shs_category_b || "Not Selected"}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold uppercase">
                          {c.status || "Active"}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteCandidate(c.id || c.student_index_no, c.student_name)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Candidate"
                        >
                          <i className="ph ph-trash text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Masterclasses Table */}
      {activeTab === 'masterclasses' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Scheduled Weekend Masterclasses & Clinics</h3>
              <p className="text-xs text-gray-400 mt-0.5">Remedial speed drills, subject masterclasses, and exam revision sessions</p>
            </div>
            <button
              onClick={() => setIsMasterclassModalOpen(true)}
              className="px-3.5 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <i className="ph-bold ph-plus"></i> Schedule Clinic
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Clinic Title & Subject</th>
                  <th className="py-4 px-4">Facilitator</th>
                  <th className="py-4 px-4">Date & Time</th>
                  <th className="py-4 px-4">Focus Topic / Venue</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-gray-400">
                      <i className="ph ph-spinner animate-spin text-xl text-brand-violet block mb-2 mx-auto"></i>
                      Loading masterclasses...
                    </td>
                  </tr>
                ) : masterclasses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-full bg-purple-50 text-brand-violet flex items-center justify-center mx-auto text-xl">
                          <i className="ph ph-calendar"></i>
                        </div>
                        <h4 className="text-sm font-bold text-brand-textMain">No Masterclasses Scheduled Yet</h4>
                        <p className="text-xs text-brand-textMuted">
                          Schedule weekend intensive revision clinics and subject masterclasses to prepare pupils for WAEC.
                        </p>
                        <button
                          onClick={() => setIsMasterclassModalOpen(true)}
                          className="px-4 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm cursor-pointer"
                        >
                          Schedule Masterclass
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  masterclasses.map((m: any) => (
                    <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-sm text-brand-textMain">{m.title}</div>
                        <span className="text-[10px] text-purple-700 font-semibold">{m.subject}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-xs text-gray-700 font-medium">{m.facilitator || "Assigned Specialist"}</span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-medium text-brand-textMain">{m.scheduled_date}</div>
                        <span className="text-[10px] text-gray-400">{m.scheduled_time}</span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-xs text-gray-700">{m.clinic_focus || "General Exam Revision"}</div>
                        <span className="text-[10px] text-gray-400 font-medium">{m.venue || "Homeroom"}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold uppercase">
                          {m.status || "Scheduled"}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteMasterclass(m.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Remove Masterclass"
                        >
                          <i className="ph ph-trash text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Schedule Masterclass */}
      <Modal
        isOpen={isMasterclassModalOpen}
        onClose={() => setIsMasterclassModalOpen(false)}
        title="Schedule BECE Masterclass / Remedial Clinic"
      >
        <form onSubmit={handleCreateMasterclass} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Clinic Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Mathematics Speed & Accuracy Drill"
              value={masterclassForm.title}
              onChange={(e) => setMasterclassForm({ ...masterclassForm, title: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject</label>
              {subjectsList.length > 0 ? (
                <select
                  required
                  value={masterclassForm.subject}
                  onChange={(e) => setMasterclassForm({ ...masterclassForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
                >
                  <option value="">Select Subject...</option>
                  {subjectsList.map((s: any) => (
                    <option key={s.id || s.code} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={masterclassForm.subject}
                  onChange={(e) => setMasterclassForm({ ...masterclassForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Facilitator / Teacher</label>
              <input
                type="text"
                placeholder="e.g. Subject Specialist"
                value={masterclassForm.facilitator}
                onChange={(e) => setMasterclassForm({ ...masterclassForm, facilitator: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
              <input
                type="date"
                required
                value={masterclassForm.scheduled_date}
                onChange={(e) => setMasterclassForm({ ...masterclassForm, scheduled_date: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Time Range</label>
              <input
                type="text"
                value={masterclassForm.scheduled_time}
                onChange={(e) => setMasterclassForm({ ...masterclassForm, scheduled_time: e.target.value })}
                placeholder="09:00 AM - 12:00 PM"
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Clinic Focus / Objectives</label>
            <textarea
              rows={2}
              placeholder="e.g. Algebraic expressions, construction geometry, word problems"
              value={masterclassForm.clinic_focus}
              onChange={(e) => setMasterclassForm({ ...masterclassForm, clinic_focus: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Venue</label>
            <input
              type="text"
              value={masterclassForm.venue}
              onChange={(e) => setMasterclassForm({ ...masterclassForm, venue: e.target.value })}
              placeholder="Main Assembly Hall / Science Lab"
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsMasterclassModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-violet text-white text-xs font-bold rounded-xl hover:bg-brand-violetDark shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Scheduling...' : 'Confirm Schedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Enrol Candidate with Smart SIS Auto-Suggest */}
      <Modal
        isOpen={isCandidateModalOpen}
        onClose={() => setIsCandidateModalOpen(false)}
        title="Enrol JHS 3 BECE Candidate"
      >
        <form onSubmit={handleCreateCandidate} className="space-y-4">
          {/* Smart SIS Suggestion Dropdown */}
          <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl">
            <label className="block text-xs font-bold text-purple-900 uppercase mb-1">
              <i className="ph-bold ph-sparkle mr-1"></i> Quick Select JHS 3 Pupil (from School Registry)
            </label>
            {jhs3Pupils.length > 0 ? (
              <select
                value={selectedSisStudentId}
                onChange={(e) => handleSelectSisStudent(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
              >
                <option value="">Choose a JHS 3 pupil to auto-fill details...</option>
                {jhs3Pupils.map((s: any) => {
                  const sId = s.id || s.index_number || s.student_id;
                  const idx = s.index_number || s.student_id || s.student_index_no || '';
                  const name = s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.student_name || s.name;
                  const isRegistered = registeredIndexSet.has(idx);
                  return (
                    <option key={sId} value={sId}>
                      {idx} • {name} ({s.class_grade || 'JHS 3'}) {isRegistered ? '✓ [Enrolled]' : '• [Pending]'}
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="text-[11px] text-purple-700">
                No pupils found in class JHS 3 / Basic 9 in the SIS. You can enter details manually below.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Student Index Number</label>
              <input
                type="text"
                required
                placeholder="e.g. ROS-2026-0042"
                value={candidateForm.student_index_no}
                onChange={(e) => setCandidateForm({ ...candidateForm, student_index_no: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet font-mono font-bold text-brand-violet"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Gender</label>
              <select
                value={candidateForm.gender}
                onChange={(e) => setCandidateForm({ ...candidateForm, gender: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Student Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Kwame Mensah"
              value={candidateForm.student_name}
              onChange={(e) => setCandidateForm({ ...candidateForm, student_name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">WAEC Registration Index (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 0102030405"
              value={candidateForm.waec_index_number}
              onChange={(e) => setCandidateForm({ ...candidateForm, waec_index_number: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target SHS (Category A)</label>
            <input
              type="text"
              placeholder="e.g. Presbyterian Boys' Secondary School (Presec Legon)"
              value={candidateForm.target_shs_category_a}
              onChange={(e) => setCandidateForm({ ...candidateForm, target_shs_category_a: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target SHS (Category B)</label>
            <input
              type="text"
              placeholder="e.g. Achimota School"
              value={candidateForm.target_shs_category_b}
              onChange={(e) => setCandidateForm({ ...candidateForm, target_shs_category_b: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsCandidateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-brand-violet text-white text-xs font-bold rounded-xl hover:bg-brand-violetDark shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Enrolling...' : 'Enrol Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Record Mock Exam Mark with Candidate Dropdown */}
      <Modal
        isOpen={isScoreModalOpen}
        onClose={() => setIsScoreModalOpen(false)}
        title="Record BECE Mock Exam Mark"
      >
        <form onSubmit={handleRecordScore} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Candidate</label>
            {candidates.length > 0 ? (
              <select
                required
                value={scoreForm.candidate_id}
                onChange={(e) => handleSelectScoreCandidate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet font-medium"
              >
                <option value="">Choose candidate...</option>
                {candidates.map((c: any) => {
                  const cId = c.id || c.student_index_no;
                  return (
                    <option key={cId} value={cId}>
                      {c.student_index_no} • {c.student_name}
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800">
                No candidates enrolled in BECE yet. Please enrol candidates first or auto-sync from SIS.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Mock Series</label>
              <select
                value={scoreForm.mock_series}
                onChange={(e) => setScoreForm({ ...scoreForm, mock_series: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
              >
                <option value="Mock 1">Mock 1</option>
                <option value="Mock 2">Mock 2</option>
                <option value="Mock 3">Mock 3</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Subject</label>
              {subjectsList.length > 0 ? (
                <select
                  required
                  value={scoreForm.subject}
                  onChange={(e) => setScoreForm({ ...scoreForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
                >
                  <option value="">Select Subject...</option>
                  {subjectsList.map((s: any) => (
                    <option key={s.id || s.code} value={s.name}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics"
                  value={scoreForm.subject}
                  onChange={(e) => setScoreForm({ ...scoreForm, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Raw Mark (0 - 100%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              required
              placeholder="e.g. 84.5"
              value={scoreForm.raw_score}
              onChange={(e) => setScoreForm({ ...scoreForm, raw_score: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-violet/20 focus:border-brand-violet font-mono text-base font-bold text-brand-violet"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Stanine grade (1 to 9) will be computed automatically according to WAEC standard boundaries.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsScoreModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || candidates.length === 0}
              className="px-4 py-2 bg-brand-violet text-white text-xs font-bold rounded-xl hover:bg-brand-violetDark shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Record Mark'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
