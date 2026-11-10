"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import Modal from '@/components/ui/Modal';
import { printTeacherAppraisalDossier, printFacultyCommendations } from '@/lib/pdf-printer';

interface RubricDomain {
  name: string;
  score: number;
  max: number;
  notes: string;
}

interface WalkthroughItem {
  id?: string;
  teacherName: string;
  classGrade: string;
  subject: string;
  strandTopic: string;
  rating: number;
  commendations: string;
  actionPoints: string;
  inspectorName?: string;
  inspectedAt?: string;
}

interface TeacherAppraisal {
  id: string;
  teacher_id: string;
  name: string;
  role: string;
  assigned: string;
  phone?: string;
  subjects?: string;
  ntcLicense: string;
  ntcPoints: string;
  performanceIndex: string;
  lessonPlanScore: string;
  schemesTotal?: number;
  schemesApproved?: number;
  schemesPending?: number;
  walkthroughScore: string;
  rubricAvg?: number;
  walkthroughCount?: number;
  walkthroughAvg?: number;
  walkthroughHistory?: WalkthroughItem[];
  status: 'Exemplary' | 'Proficient' | 'Needs Support' | 'Pending Evaluation' | string;
  scheduledDate?: string;
  scheduledTime?: string;
  observationFocus?: string;
  rubric: {
    domain1: RubricDomain;
    domain2: RubricDomain;
    domain3: RubricDomain;
    domain4: RubricDomain;
    domain5: RubricDomain;
  };
  strengths: string[];
  growthAreas: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export default function HeadmasterAppraisalsPage() {
  const [teachers, setTeachers] = useState<TeacherAppraisal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXEMPLARY' | 'PROFICIENT' | 'NEEDS_SUPPORT' | 'PENDING'>('ALL');

  // Dossier modal state
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherAppraisal | null>(null);
  const [modalTab, setModalTab] = useState<'RUBRIC' | 'WALKTHROUGHS'>('RUBRIC');
  const [isEditingRubric, setIsEditingRubric] = useState(false);
  const [isSavingEvaluation, setIsSavingEvaluation] = useState(false);

  // Edit form state
  const [editD1, setEditD1] = useState(4.5);
  const [editD1Notes, setEditD1Notes] = useState('');
  const [editD2, setEditD2] = useState(4.5);
  const [editD2Notes, setEditD2Notes] = useState('');
  const [editD3, setEditD3] = useState(4.5);
  const [editD3Notes, setEditD3Notes] = useState('');
  const [editD4, setEditD4] = useState(4.5);
  const [editD4Notes, setEditD4Notes] = useState('');
  const [editD5, setEditD5] = useState(4.5);
  const [editD5Notes, setEditD5Notes] = useState('');
  const [editStrengths, setEditStrengths] = useState('');
  const [editGrowthAreas, setEditGrowthAreas] = useState('');
  const [editStatus, setEditStatus] = useState<'Exemplary' | 'Proficient' | 'Needs Support'>('Proficient');

  // Walkthrough scheduling modal
  const [scheduleModalTeacher, setScheduleModalTeacher] = useState<TeacherAppraisal | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:30');
  const [scheduleFocus, setScheduleFocus] = useState('GES/NaCCA Standards & Practical Manipulatives');
  const [isScheduling, setIsScheduling] = useState(false);

  // Log Walkthrough Modal (Direct observation entry)
  const [logWalkthroughTeacher, setLogWalkthroughTeacher] = useState<TeacherAppraisal | null>(null);
  const [wtClass, setWtClass] = useState('');
  const [wtSubject, setWtSubject] = useState('');
  const [wtStrand, setWtStrand] = useState('');
  const [wtRating, setWtRating] = useState(5);
  const [wtCommendations, setWtCommendations] = useState('');
  const [wtActionPoints, setWtActionPoints] = useState('');
  const [isLoggingWalkthrough, setIsLoggingWalkthrough] = useState(false);

  // Commendations state
  const [isIssuing, setIsIssuing] = useState(false);

  useEffect(() => {
    setCurrentUser(AuthService.getCurrentUser());
  }, []);

  const loadAppraisals = useCallback(async () => {
    try {
      setLoading(true);
      const data = await RoselandApi.academic.getAppraisals();
      if (Array.isArray(data)) {
        setTeachers(data);
      }
    } catch (err: any) {
      console.error("Failed to load appraisals:", err);
      toast.error(err?.message || "Failed to load live educator appraisals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppraisals();
  }, [loadAppraisals]);

  // Open detailed evaluation / rubric editor
  const handleOpenRubric = (teacher: TeacherAppraisal) => {
    setSelectedTeacher(teacher);
    setModalTab('RUBRIC');
    setEditD1(teacher.rubric.domain1.score !== undefined ? teacher.rubric.domain1.score : 0.0);
    setEditD1Notes(teacher.rubric.domain1.notes || '');
    setEditD2(teacher.rubric.domain2.score !== undefined ? teacher.rubric.domain2.score : 0.0);
    setEditD2Notes(teacher.rubric.domain2.notes || '');
    setEditD3(teacher.rubric.domain3.score !== undefined ? teacher.rubric.domain3.score : 0.0);
    setEditD3Notes(teacher.rubric.domain3.notes || '');
    setEditD4(teacher.rubric.domain4.score !== undefined ? teacher.rubric.domain4.score : 0.0);
    setEditD4Notes(teacher.rubric.domain4.notes || '');
    setEditD5(teacher.rubric.domain5.score !== undefined ? teacher.rubric.domain5.score : 0.0);
    setEditD5Notes(teacher.rubric.domain5.notes || '');
    setEditStrengths((teacher.strengths || []).join(', '));
    setEditGrowthAreas(teacher.growthAreas || '');

    const currentStatus = teacher.status as string;
    setEditStatus((currentStatus === 'Pending Evaluation' ? 'Proficient' : currentStatus) as any);
    setIsEditingRubric(false);
  };

  // Submit evaluation update to backend
  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacher) return;

    try {
      setIsSavingEvaluation(true);
      const inspector = currentUser?.fullName || currentUser?.username || "Headmaster";
      const payload = {
        teacher_id: selectedTeacher.teacher_id || selectedTeacher.id,
        teacher_name: selectedTeacher.name,
        role: selectedTeacher.role,
        assigned_class: selectedTeacher.assigned,
        ntc_license: selectedTeacher.ntcLicense,
        domain1_score: Number(editD1),
        domain1_notes: editD1Notes,
        domain2_score: Number(editD2),
        domain2_notes: editD2Notes,
        domain3_score: Number(editD3),
        domain3_notes: editD3Notes,
        domain4_score: Number(editD4),
        domain4_notes: editD4Notes,
        domain5_score: Number(editD5),
        domain5_notes: editD5Notes,
        strengths: editStrengths,
        growth_areas: editGrowthAreas,
        status: editStatus,
        evaluated_by: inspector
      };

      await RoselandApi.academic.evaluateTeacher(payload);

      // Dispatch confidential direct alert to educator only (never whole school broadcast)
      try {
        if (selectedTeacher.phone) {
          await RoselandApi.notify.sendSms({
            phone: selectedTeacher.phone,
            message: `Roseland HM Desk: Dear ${selectedTeacher.name}, your pedagogical evaluation has been updated by ${inspector}. Classified as: ${editStatus}. Check your appraisal portal.`
          });
        }
      } catch {}

      toast.success(`GES 5-Domain appraisal saved for ${selectedTeacher.name}`);
      setIsEditingRubric(false);
      setSelectedTeacher(null);
      await loadAppraisals();
    } catch (err: any) {
      console.error("Save evaluation error:", err);
      toast.error(err?.message || "Failed to save appraisal evaluation.");
    } finally {
      setIsSavingEvaluation(false);
    }
  };

  // Open Schedule Walkthrough Modal
  const handleOpenScheduleModal = (teacher: TeacherAppraisal) => {
    setScheduleModalTeacher(teacher);
    setScheduleDate(teacher.scheduledDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);
    setScheduleTime(teacher.scheduledTime || '09:30');
    setScheduleFocus(teacher.observationFocus || 'Curricular TLR Integration & Pupil Engagement');
  };

  // Submit Walkthrough Schedule
  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleModalTeacher) return;

    try {
      setIsScheduling(true);
      const inspector = currentUser?.fullName || currentUser?.username || "Headmaster";
      const payload = {
        teacher_id: scheduleModalTeacher.teacher_id || scheduleModalTeacher.id,
        teacher_name: scheduleModalTeacher.name,
        scheduled_date: scheduleDate,
        scheduled_time: scheduleTime,
        observation_focus: scheduleFocus
      };

      await RoselandApi.academic.scheduleTeacherWalkthrough(payload);

      // Dispatch confidential direct alert to educator only (never whole school broadcast)
      try {
        if (scheduleModalTeacher.phone) {
          await RoselandApi.notify.sendSms({
            phone: scheduleModalTeacher.phone,
            message: `Roseland HM Desk: Dear ${scheduleModalTeacher.name}, a classroom observation has been scheduled for ${scheduleDate} at ${scheduleTime}. Focus: ${scheduleFocus}.`
          });
        }
      } catch {}

      toast.success(`Walkthrough scheduled for ${scheduleModalTeacher.name} on ${scheduleDate} at ${scheduleTime}`);
      setScheduleModalTeacher(null);
      await loadAppraisals();
    } catch (err: any) {
      console.error("Schedule walkthrough error:", err);
      toast.error(err?.message || "Failed to schedule observation walkthrough.");
    } finally {
      setIsScheduling(false);
    }
  };

  // Open Direct Log Walkthrough Modal
  const handleOpenLogWalkthroughModal = (teacher: TeacherAppraisal) => {
    setLogWalkthroughTeacher(teacher);
    setWtClass(teacher.assigned !== 'General Faculty' ? teacher.assigned : 'Primary 4');
    setWtSubject(teacher.subjects || 'Core Curriculum');
    setWtStrand(teacher.observationFocus || 'Live Instructional Delivery');
    setWtRating(5);
    setWtCommendations('Observed energetic learner engagement and disciplined classroom atmosphere.');
    setWtActionPoints('Integrate more manipulative TLRs and pace student question drills.');
  };

  // Submit Walkthrough Observation
  const handleConfirmLogWalkthrough = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logWalkthroughTeacher) return;

    try {
      setIsLoggingWalkthrough(true);
      const inspector = currentUser?.fullName || currentUser?.username || "Headmaster";
      await RoselandApi.academic.logTeacherWalkthrough({
        teacher_id: logWalkthroughTeacher.teacher_id || logWalkthroughTeacher.id,
        teacher_name: logWalkthroughTeacher.name,
        class_grade: wtClass,
        subject: wtSubject,
        strand_topic: wtStrand,
        rating: wtRating,
        commendations: wtCommendations,
        action_points: wtActionPoints,
        inspector_name: inspector
      });

      // Dispatch confidential direct alert to educator only (never whole school broadcast)
      try {
        if (logWalkthroughTeacher.phone) {
          await RoselandApi.notify.sendSms({
            phone: logWalkthroughTeacher.phone,
            message: `Roseland HM Desk: Dear ${logWalkthroughTeacher.name}, supervisory observation notes (${wtRating}/5 ★) have been recorded for your lesson in ${wtClass}. View feedback in your portal.`
          });
        }
      } catch {}

      toast.success(`Walkthrough recorded & synced for ${logWalkthroughTeacher.name}!`);
      setLogWalkthroughTeacher(null);
      await loadAppraisals();
    } catch (err: any) {
      console.error("Log walkthrough error:", err);
      toast.error(err?.message || "Failed to log walkthrough observation.");
    } finally {
      setIsLoggingWalkthrough(false);
    }
  };

  // Issue Printable Commendation Certificates
  const handleIssueCommendations = async () => {
    try {
      setIsIssuing(true);
      const res = await RoselandApi.academic.issueCommendations();
      if (!res.count || res.count === 0) {
        toast.error(res.message || "No exemplary educators found yet.");
        return;
      }

      const certData = (res.dossiers && res.dossiers.length > 0)
        ? res.dossiers
        : res.teachers.map((name: string) => ({ name, performanceIndex: 'Exemplary' }));

      printFacultyCommendations(certData);
      toast.success(res.message || `Certificates compiled for: ${res.teachers.join(', ')}`);
    } catch (err: any) {
      console.error("Issue commendations error:", err);
      toast.error(err?.message || "Failed to issue commendations.");
    } finally {
      setIsIssuing(false);
    }
  };

  // Filter teachers by status tabs
  const filteredTeachers = teachers.filter((t) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'EXEMPLARY') return t.status === 'Exemplary';
    if (activeTab === 'PROFICIENT') return t.status === 'Proficient';
    if (activeTab === 'NEEDS_SUPPORT') return t.status === 'Needs Support';
    if (activeTab === 'PENDING') return t.status === 'Pending Evaluation' || t.performanceIndex === '0.0%' || t.performanceIndex === '0%';
    return true;
  });

  const countExemplary = teachers.filter(t => t.status === 'Exemplary').length;
  const countProficient = teachers.filter(t => t.status === 'Proficient').length;
  const countNeedsSupport = teachers.filter(t => t.status === 'Needs Support').length;
  const countPending = teachers.filter(t => t.status === 'Pending Evaluation' || t.performanceIndex === '0.0%' || t.performanceIndex === '0%').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Faculty Quality & Supervisory Standards
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Teacher Performance & Appraisals
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Evaluate educators across GES 5-Domain pedagogical rubrics, live scheme compliance, and schedule supervisory walkthroughs.
          </p>
        </div>

        {teachers.length > 0 && (
          <button
            onClick={handleIssueCommendations}
            disabled={isIssuing || countExemplary === 0}
            className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <i className="ph-bold ph-certificate"></i> {isIssuing ? 'Printing...' : `Issue Faculty Commendations (${countExemplary})`}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-brand-bg p-1.5 rounded-2xl border border-gray-200/60 text-xs font-bold">
        {[
          { id: 'ALL', label: `All Faculty (${teachers.length})` },
          { id: 'EXEMPLARY', label: `Exemplary (${countExemplary})` },
          { id: 'PROFICIENT', label: `Proficient (${countProficient})` },
          { id: 'NEEDS_SUPPORT', label: `Needs Support (${countNeedsSupport})` },
          { id: 'PENDING', label: `Pending Evaluation (${countPending})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-brand-violet text-white shadow-xs'
                : 'text-brand-textMuted hover:text-brand-textMain'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-100 shadow-sm text-center">
          <div className="w-10 h-10 border-3 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">Syncing live faculty dossiers & lesson scheme compliance...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center space-y-3">
          <i className="ph ph-chalkboard-teacher text-4xl text-gray-300 block"></i>
          <h3 className="font-serif font-bold text-base text-brand-textMain">No Teaching Faculty in this Category</h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto">
            All registered teaching faculty across Auth, SIS, and Timetable Allocations automatically appear here for supervisory oversight.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeachers.map((t) => (
            <div key={t.id || t.name} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-brand-violetLight text-brand-violet font-bold flex items-center justify-center text-sm border border-brand-violet/20 shrink-0">
                      {t.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-brand-textMain">{t.name}</h3>
                      <p className="text-xs text-brand-violet font-bold">{t.role}</p>
                      <span className="text-[11px] text-gray-400 font-mono">{t.assigned} • {t.ntcLicense}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    t.status === 'Exemplary' 
                      ? 'bg-green-100 text-green-800' 
                      : t.status === 'Proficient'
                      ? 'bg-blue-100 text-blue-800'
                      : t.status === 'Pending Evaluation'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>

                {/* Performance Metric Triad */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-brand-bg p-3.5 rounded-2xl border border-gray-100 mt-4">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Overall Index</span>
                    <strong className="text-base font-bold text-brand-textMain">{t.performanceIndex}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Schemes Vetted</span>
                    <strong className="text-xs font-bold text-brand-violet block mt-0.5">{t.lessonPlanScore}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Supervisory Score</span>
                    <strong className="text-base font-bold text-amber-700">{t.walkthroughScore}</strong>
                  </div>
                </div>

                {/* Scheduled Walkthrough Badge if set */}
                {t.scheduledDate && (
                  <div className="mt-3 p-3 rounded-2xl bg-purple-50 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="flex items-center gap-1.5 text-brand-violet font-bold">
                        <i className="ph-bold ph-calendar-check"></i> Walkthrough Scheduled:
                      </span>
                      <p className="text-purple-950 font-medium text-[11px] mt-0.5">
                        {t.scheduledDate} @ {t.scheduledTime || '09:30'} • Focus: {t.observationFocus}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenLogWalkthroughModal(t)}
                      className="px-3 py-1.5 bg-brand-violet text-white font-bold rounded-xl text-[11px] hover:bg-brand-violetDark transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      Conduct & Log Now
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleOpenRubric(t)}
                  className="flex-1 py-2.5 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-textMain font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="ph-bold ph-list-numbers"></i> 5-Domain Rubric
                </button>
                <button
                  onClick={() => handleOpenLogWalkthroughModal(t)}
                  className="px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Record direct supervisory walkthrough observation"
                >
                  <i className="ph-bold ph-eye"></i> Log Walkthrough
                </button>
                <button
                  onClick={() => handleOpenScheduleModal(t)}
                  className="flex-1 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="ph-bold ph-calendar-plus"></i> Schedule
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. DETAILED 5-DOMAIN RUBRIC & EVALUATION MODAL */}
      <Modal
        isOpen={!!selectedTeacher}
        onClose={() => setSelectedTeacher(null)}
        title={selectedTeacher ? `Appraisal Dossier: ${selectedTeacher.name}` : ''}
        subtitle="GES / NaCCA 5-Domain Supervisory Evaluation & Walkthrough Log"
        size="3xl"
      >
        {selectedTeacher && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-brand-bg p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-violetLight text-brand-violet font-bold flex items-center justify-center text-lg border border-brand-violet/20 shrink-0">
                  {selectedTeacher.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brand-violet bg-white px-2 py-0.5 rounded border border-brand-violet/20">
                      {selectedTeacher.assigned}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      selectedTeacher.status === 'Exemplary'
                        ? 'bg-green-100 text-green-800'
                        : selectedTeacher.status === 'Proficient'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedTeacher.status === 'Pending Evaluation'
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedTeacher.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-serif font-bold text-brand-textMain mt-1">
                    {selectedTeacher.name}
                  </h2>
                  <p className="text-xs text-brand-textMuted">
                    {selectedTeacher.role} • License: {selectedTeacher.ntcLicense} • Overall Index: <strong>{selectedTeacher.performanceIndex}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingRubric(!isEditingRubric)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isEditingRubric ? 'bg-brand-violet text-white' : 'bg-white border border-gray-200 text-brand-textMain hover:border-brand-violet'
                  }`}
                >
                  <i className="ph ph-pencil-simple"></i> {isEditingRubric ? 'Cancel Edit' : 'Edit Rubric Scores'}
                </button>
              </div>
            </div>

            {/* Sub-tab navigation inside dossier */}
            {!isEditingRubric && (
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalTab('RUBRIC')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    modalTab === 'RUBRIC'
                      ? 'bg-brand-violetLight text-brand-violet font-extrabold'
                      : 'text-gray-500 hover:text-brand-textMain'
                  }`}
                >
                  5-Domain Rubric Breakdown
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('WALKTHROUGHS')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    modalTab === 'WALKTHROUGHS'
                      ? 'bg-brand-violetLight text-brand-violet font-extrabold'
                      : 'text-gray-500 hover:text-brand-textMain'
                  }`}
                >
                  Classroom Walkthrough History ({selectedTeacher.walkthroughHistory?.length || 0})
                </button>
              </div>
            )}

            {/* View / Edit Mode */}
            {isEditingRubric ? (
              <form onSubmit={handleSaveEvaluation} className="space-y-5">
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {/* Domain 1 */}
                  <div className="p-4 rounded-2xl bg-brand-bg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-brand-textMain">Domain 1: Professional Knowledge & GES Curriculum Alignment</label>
                      <span className="font-mono font-bold text-brand-violet">{editD1} / 5.0</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={editD1}
                      onChange={(e) => setEditD1(parseFloat(e.target.value))}
                      className="w-full accent-brand-violet cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Supervisory feedback for Domain 1..."
                      value={editD1Notes}
                      onChange={(e) => setEditD1Notes(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet"
                    />
                  </div>

                  {/* Domain 2 */}
                  <div className="p-4 rounded-2xl bg-brand-bg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-brand-textMain">Domain 2: Instructional Delivery & Concrete TLR Utilization</label>
                      <span className="font-mono font-bold text-brand-violet">{editD2} / 5.0</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={editD2}
                      onChange={(e) => setEditD2(parseFloat(e.target.value))}
                      className="w-full accent-brand-violet cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Supervisory feedback for Domain 2..."
                      value={editD2Notes}
                      onChange={(e) => setEditD2Notes(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet"
                    />
                  </div>

                  {/* Domain 3 */}
                  <div className="p-4 rounded-2xl bg-brand-bg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-brand-textMain">Domain 3: Classroom Decorum & Inclusive Engagement</label>
                      <span className="font-mono font-bold text-brand-violet">{editD3} / 5.0</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={editD3}
                      onChange={(e) => setEditD3(parseFloat(e.target.value))}
                      className="w-full accent-brand-violet cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Supervisory feedback for Domain 3..."
                      value={editD3Notes}
                      onChange={(e) => setEditD3Notes(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet"
                    />
                  </div>

                  {/* Domain 4 */}
                  <div className="p-4 rounded-2xl bg-brand-bg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-brand-textMain">Domain 4: Continuous Assessment & Marking Promptness</label>
                      <span className="font-mono font-bold text-brand-violet">{editD4} / 5.0</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={editD4}
                      onChange={(e) => setEditD4(parseFloat(e.target.value))}
                      className="w-full accent-brand-violet cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Supervisory feedback for Domain 4..."
                      value={editD4Notes}
                      onChange={(e) => setEditD4Notes(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet"
                    />
                  </div>

                  {/* Domain 5 */}
                  <div className="p-4 rounded-2xl bg-brand-bg border border-gray-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-xs text-brand-textMain">Domain 5: Professional Ethics, Punctuality & NTC CPD</label>
                      <span className="font-mono font-bold text-brand-violet">{editD5} / 5.0</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={editD5}
                      onChange={(e) => setEditD5(parseFloat(e.target.value))}
                      className="w-full accent-brand-violet cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Supervisory feedback for Domain 5..."
                      value={editD5Notes}
                      onChange={(e) => setEditD5Notes(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet"
                    />
                  </div>

                  {/* Commendations & Growth Areas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-xs text-brand-textMain mb-1">Key Strengths & Commendations</label>
                      <textarea
                        rows={2}
                        value={editStrengths}
                        onChange={(e) => setEditStrengths(e.target.value)}
                        placeholder="Comma separated strengths..."
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-xs text-brand-textMain mb-1">Actionable Growth Areas</label>
                      <textarea
                        rows={2}
                        value={editGrowthAreas}
                        onChange={(e) => setEditGrowthAreas(e.target.value)}
                        placeholder="Supervisory recommendations..."
                        className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-xs text-brand-textMain mb-1">Overall Classification</label>
                    <select
                      value={editStatus}
                      onChange={(e: any) => setEditStatus(e.target.value)}
                      className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-brand-violet"
                    >
                      <option value="Exemplary">Exemplary (Top Performance Tier)</option>
                      <option value="Proficient">Proficient (Meets Standard)</option>
                      <option value="Needs Support">Needs Support (Remediation Required)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingRubric(false)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEvaluation}
                    className="flex-1 py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <i className="ph-bold ph-check"></i> {isSavingEvaluation ? 'Saving...' : 'Save Formal Appraisal Scorecard'}
                  </button>
                </div>
              </form>
            ) : modalTab === 'RUBRIC' ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-serif font-bold text-sm text-brand-textMain uppercase tracking-wider">
                    GES / NaCCA 5-Domain Standard Scorecard
                  </h4>

                  {Object.entries(selectedTeacher.rubric).map(([key, domain], idx) => (
                    <div key={key} className="bg-brand-bg p-4 rounded-2xl border border-gray-100 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <strong className="text-brand-textMain">Domain {idx + 1}: {domain.name}</strong>
                        <span className="font-mono font-bold text-brand-violet text-sm">{domain.score} / {domain.max}</span>
                      </div>
                      <p className="text-gray-500 text-[11px]">{domain.notes}</p>
                    </div>
                  ))}
                </div>

                {/* Strengths & Growth Areas Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl bg-green-50/60 border border-green-100 text-xs">
                    <strong className="text-green-900 block mb-1">Supervisory Commendations:</strong>
                    <ul className="list-disc list-inside text-green-950 space-y-0.5">
                      {(selectedTeacher.strengths || []).map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs">
                    <strong className="text-brand-violet block mb-1">Target Growth Points:</strong>
                    <p className="text-purple-950">{selectedTeacher.growthAreas}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      printTeacherAppraisalDossier(selectedTeacher as any);
                      toast.success(`Formal appraisal dossier exported for ${selectedTeacher.name}`);
                    }}
                    className="w-full py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="ph-bold ph-printer"></i> Print Official Appraisal Dossier (PDF)
                  </button>
                </div>
              </div>
            ) : (
              /* Walkthroughs Tab */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-brand-textMain uppercase tracking-wider">
                    Supervisory Classroom Walkthroughs ({selectedTeacher.walkthroughHistory?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeacher(null);
                      handleOpenLogWalkthroughModal(selectedTeacher);
                    }}
                    className="px-3 py-1.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <i className="ph-bold ph-plus"></i> Record Observation
                  </button>
                </div>

                {(!selectedTeacher.walkthroughHistory || selectedTeacher.walkthroughHistory.length === 0) ? (
                  <div className="p-8 text-center bg-brand-bg rounded-2xl border border-dashed border-gray-200 text-xs text-brand-textMuted">
                    No classroom walkthrough observations recorded yet for {selectedTeacher.name}.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                    {selectedTeacher.walkthroughHistory.map((w, idx) => (
                      <div key={w.id || idx} className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-brand-textMain text-sm block">{w.classGrade} • {w.subject}</strong>
                            <span className="text-[11px] text-brand-violet font-semibold">{w.strandTopic}</span>
                          </div>
                          <span className="font-mono text-sm font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-xl">
                            ★ {w.rating} / 5.0
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-1">
                          <p><strong className="text-green-800">Commendation:</strong> {w.commendations}</p>
                          <p><strong className="text-purple-800">Action Point:</strong> {w.actionPoints}</p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                          <span>Inspector: {w.inspectorName || 'Headmaster'}</span>
                          <span>{w.inspectedAt ? new Date(w.inspectedAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'Recorded'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 2. SCHEDULE APPRAISAL / WALKTHROUGH MODAL */}
      <Modal
        isOpen={!!scheduleModalTeacher}
        onClose={() => setScheduleModalTeacher(null)}
        title="Schedule Classroom Appraisal & Walkthrough"
        subtitle={scheduleModalTeacher ? `Supervisory Directorial Observation for ${scheduleModalTeacher.name}` : ''}
        size="md"
      >
        {scheduleModalTeacher && (
          <form onSubmit={handleConfirmSchedule} className="space-y-4 text-xs pt-2">
            <div>
              <label className="block font-bold text-brand-textMain mb-1">Observation Date</label>
              <input
                type="date"
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain mb-1">Time Slot</label>
              <input
                type="time"
                required
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain mb-1">Observation Focus / Topic</label>
              <input
                type="text"
                required
                value={scheduleFocus}
                onChange={(e) => setScheduleFocus(e.target.value)}
                placeholder="e.g. Concrete TLR Usage, Student Participation, Lesson Timing"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>

            <button
              type="submit"
              disabled={isScheduling}
              className="w-full py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
            >
              <i className="ph-bold ph-calendar-check"></i> {isScheduling ? 'Scheduling...' : 'Confirm & Notify Educator'}
            </button>
          </form>
        )}
      </Modal>

      {/* 3. LOG WALKTHROUGH MODAL */}
      <Modal
        isOpen={!!logWalkthroughTeacher}
        onClose={() => setLogWalkthroughTeacher(null)}
        title="Log Classroom Walkthrough Observation"
        subtitle={logWalkthroughTeacher ? `Supervisory Directorial Record for ${logWalkthroughTeacher.name}` : ''}
        size="lg"
      >
        {logWalkthroughTeacher && (
          <form onSubmit={handleConfirmLogWalkthrough} className="space-y-4 text-xs pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Observed Class *</label>
                <input
                  type="text"
                  required
                  value={wtClass}
                  onChange={(e) => setWtClass(e.target.value)}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Subject Observed *</label>
                <input
                  type="text"
                  required
                  value={wtSubject}
                  onChange={(e) => setWtSubject(e.target.value)}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Curricular Strand / Topic</label>
              <input
                type="text"
                value={wtStrand}
                onChange={(e) => setWtStrand(e.target.value)}
                placeholder="e.g. Number & Numeration, Fractions"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Pedagogical Delivery Rating (1 to 5) *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setWtRating(star)}
                    className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center border transition-all cursor-pointer ${
                      wtRating >= star
                        ? 'bg-amber-400 text-amber-950 border-amber-400 shadow-xs'
                        : 'bg-brand-bg text-gray-400 border-gray-200'
                    }`}
                  >
                    ★ {star}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Commendations & Strengths *</label>
              <textarea
                rows={2}
                required
                value={wtCommendations}
                onChange={(e) => setWtCommendations(e.target.value)}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
              ></textarea>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Action Points for Teacher Refinement</label>
              <textarea
                rows={2}
                value={wtActionPoints}
                onChange={(e) => setWtActionPoints(e.target.value)}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setLogWalkthroughTeacher(null)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoggingWalkthrough}
                className="px-6 py-2.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isLoggingWalkthrough ? (
                  <>
                    <i className="ph-bold ph-spinner animate-spin"></i> Saving...
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-check"></i> Record Walkthrough & Sync
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
}
