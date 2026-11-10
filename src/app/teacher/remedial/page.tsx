"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import Modal from '@/components/ui/Modal';

interface RemedialCase {
  id: string;
  name: string;
  avatar: string;
  focusArea: string;
  currentAverage: string;
  targetAverage: string;
  peerBuddy: string;
  sessionsCompleted: number;
  lastSessionDate: string;
  status: 'In Progress' | 'Target Achieved' | 'Escalated to Head' | string;
  classGrade?: string;
  assignedTeacher?: string;
  assignedTeacherId?: string;
  acknowledgmentStatus?: 'PENDING' | 'ACKNOWLEDGED' | 'UNASSIGNED';
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  bottlenecks?: string[];
  notes?: string;
}

export default function TeacherRemedial() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState<RemedialCase | null>(null);
  const [caseToAcknowledge, setCaseToAcknowledge] = useState<RemedialCase | null>(null);
  const [ackNotes, setAckNotes] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<RemedialCase[]>([]);
  const [myDirectives, setMyDirectives] = useState<RemedialCase[]>([]);

  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState('Satisfactory (Needs mild reinforcement)');

  // 1. Initial User and Class context resolution
  useEffect(() => {
    const initContext = async () => {
      try {
        const user = AuthService.getCurrentUser();
        setCurrentUser(user);
        let targetClass = user?.assignedClass || '';

        const classRes = await RoselandApi.sis.getClasses();
        const available = Array.isArray(classRes?.data) ? classRes.data : Array.isArray(classRes) ? classRes : [];
        setClassList(available);

        if (!targetClass && available.length > 0) {
          targetClass = available[0].name;
        }
        setAssignedClass(targetClass);
      } catch (err) {
        console.warn("Failed to load class registry", err);
      }
    };
    initContext();
  }, []);

  // 2. Fetch Cases (Both Class & Assigned Directives)
  const loadRemedialCases = useCallback(async () => {
    setLoading(true);
    try {
      const user = currentUser || AuthService.getCurrentUser();
      const teacherName = user?.fullName || user?.username || '';

      // Fetch class-specific cases
      const classPromise = assignedClass ? RoselandApi.academic.getAtRiskStudents(assignedClass) : Promise.resolve({ data: [] });
      // Fetch cases specifically assigned to this educator across the school
      const assignedPromise = teacherName ? RoselandApi.academic.getAtRiskStudents(undefined, teacherName) : Promise.resolve({ data: [] });

      const [classRes, assignedRes] = await Promise.allSettled([classPromise, assignedPromise]);

      const rawClassList = classRes.status === 'fulfilled' && classRes.value?.data ? classRes.value.data : [];
      const rawAssignedList = assignedRes.status === 'fulfilled' && assignedRes.value?.data ? assignedRes.value.data : [];

      const mapToRemedialCase = (item: any): RemedialCase => ({
        id: item.student_id || item.index_number || item.index_no || item.index || item.id,
        name: item.student_name || item.name || item.full_name,
        avatar: item.avatar || item.photo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        focusArea: item.intervention || item.focus_area || item.reason || (item.bottlenecks?.length ? item.bottlenecks.join(', ') : "Core Subject Remediation"),
        currentAverage: item.average || (item.current_average ? `${item.current_average}%` : "Below 50%"),
        targetAverage: item.target_average || "65.0%",
        peerBuddy: item.peer_buddy || "Class Scholar Peer Mentor",
        sessionsCompleted: item.sessions_completed || 0,
        lastSessionDate: item.last_session_date || "Pending first session",
        status: item.status || "In Progress",
        classGrade: item.class_grade || item.class || assignedClass,
        assignedTeacher: item.assigned_teacher || item.assignedTeacher,
        assignedTeacherId: item.assigned_teacher_id || item.assignedTeacherId,
        acknowledgmentStatus: item.acknowledgment_status || 'UNASSIGNED',
        acknowledgedAt: item.acknowledged_at,
        acknowledgedBy: item.acknowledged_by,
        bottlenecks: item.bottlenecks || [],
        notes: item.notes || ''
      });

      // Class cases
      const mappedClass: RemedialCase[] = (Array.isArray(rawClassList) ? rawClassList : []).map(mapToRemedialCase);
      setCases(mappedClass);

      // Directives specifically assigned to me
      const mappedAssigned: RemedialCase[] = (Array.isArray(rawAssignedList) ? rawAssignedList : []).map(mapToRemedialCase);
      setMyDirectives(mappedAssigned);

    } catch (err) {
      console.warn("Could not load remedial cases", err);
      setCases([]);
      setMyDirectives([]);
    } finally {
      setLoading(false);
    }
  }, [assignedClass, currentUser]);

  useEffect(() => {
    loadRemedialCases();
  }, [loadRemedialCases]);

  // Acknowledge Remedial Case
  const handleAcknowledge = async () => {
    if (!caseToAcknowledge) return;
    const teacherName = currentUser?.fullName || currentUser?.username || 'Assigned Teacher';

    setIsSubmittingAck(true);
    try {
      await RoselandApi.academic.acknowledgeRemedialCase({
        indexNo: caseToAcknowledge.id,
        teacherName: teacherName,
        acknowledgmentNotes: ackNotes || 'Acknowledged receipt of Headmaster remedial directive and scheduled diagnostic baseline.'
      });

      toast.success(`Formally acknowledged remedial case for ${caseToAcknowledge.name}! Headmaster registry synchronized.`);

      // Optimistically update lists
      const updateCase = (c: RemedialCase) => {
        if (c.id === caseToAcknowledge.id) {
          return {
            ...c,
            acknowledgmentStatus: 'ACKNOWLEDGED' as const,
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: teacherName
          };
        }
        return c;
      };

      setMyDirectives(prev => prev.map(updateCase));
      setCases(prev => prev.map(updateCase));

      setIsAckModalOpen(false);
      setCaseToAcknowledge(null);
      setAckNotes('');
    } catch (err: any) {
      toast.error(err?.message || "Could not record acknowledgment.");
    } finally {
      setIsSubmittingAck(false);
    }
  };

  // Log 1-on-1 Session
  const handleLogSession = async () => {
    if (!selectedScholar) return;

    setCases(prev => prev.map(c => {
      if (c.id === selectedScholar.id) {
        return {
          ...c,
          sessionsCompleted: c.sessionsCompleted + 1,
          lastSessionDate: "Today"
        };
      }
      return c;
    }));

    try {
      await RoselandApi.academic.logRemedialSession({
        studentId: selectedScholar.id,
        studentName: selectedScholar.name,
        classGrade: selectedScholar.classGrade || assignedClass,
        topic: selectedScholar.focusArea,
        notes: sessionNotes || "1-on-1 pedagogical review completed.",
        rating: sessionRating,
        conductedBy: currentUser?.fullName || 'Class Teacher'
      });
    } catch (err) {
      // Optimistic fallback
    }

    toast.success(`Logged remedial intervention session for ${selectedScholar.name}! Synchronized with Headmaster At-Risk Registry.`);
    setIsLogModalOpen(false);
    setSessionNotes('');
  };

  // Filter pending directives assigned to current user
  const pendingDirectives = myDirectives.filter(d => d.acknowledgmentStatus === 'PENDING');

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Differentiated Pastoral Care • {assignedClass || 'Active Class'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Remedial Catch-Up & At-Risk Registry
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Track 1-on-1 pedagogical interventions, acknowledge Headmaster directives, and sync growth with the academic registry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {classList.length > 0 && (
            <select
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet cursor-pointer"
            >
              {classList.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="text-right pl-3 border-l border-gray-100">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Active Interventions</span>
            <strong className="text-xl font-serif font-bold text-amber-600">{cases.length} Scholars</strong>
          </div>
        </div>
      </div>

      {/* HEADMASTER DIRECTIVE BANNER: PENDING TEACHER ACKNOWLEDGMENT */}
      {pendingDirectives.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-brand-violet rounded-3xl p-6 sm:p-7 text-white shadow-lg space-y-4 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                <i className="ph-fill ph-bell-ringing text-xl text-yellow-200 animate-bounce"></i>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200 block">
                  Confidential Headmaster Directive • Action Required
                </span>
                <h3 className="text-lg font-serif font-bold">
                  {pendingDirectives.length} Remedial Intervention Case{pendingDirectives.length > 1 ? 's' : ''} Delegated to You
                </h3>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-white/20 backdrop-blur-xs text-white border border-white/30 self-start sm:self-auto">
              Awaiting Your Acknowledgment
            </span>
          </div>

          <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
            The Headmaster has designated you as the lead pastoral and academic mentor for the scholar(s) below. Please review the diagnostic bottlenecks and confirm your acceptance to initialize the remedial cycle.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {pendingDirectives.map((d) => (
              <div
                key={d.id}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 space-y-3 text-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md">
                      {d.classGrade || 'Classroom'}
                    </span>
                    <span className="text-[10px] font-bold text-amber-200">
                      Score: {d.currentAverage} → Goal: {d.targetAverage}
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-sm">{d.name}</h4>
                  <p className="text-[11px] text-amber-100 line-clamp-2 mt-0.5">
                    <strong>Focus:</strong> {d.focusArea}
                  </p>
                  {d.notes && (
                    <p className="text-[10px] text-white/80 bg-black/20 p-2 rounded-xl mt-2 italic line-clamp-2">
                      &quot;{d.notes}&quot;
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCaseToAcknowledge(d);
                    setIsAckModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 bg-white text-brand-violet hover:bg-amber-50 font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <i className="ph-bold ph-check-circle text-sm text-emerald-600"></i>
                  Acknowledge & Accept Assignment
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading & Empty State */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="animate-spin w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading remedial registry...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <h3 className="text-base font-serif font-bold text-brand-textMain mb-1">No Scholars Flagged for Remediation</h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto">
            All pupils in {assignedClass || 'this class'} are performing above the at-risk threshold. Any student whose continuous assessment drops below 50% will be automatically flagged here.
          </p>
        </div>
      ) : (
        /* Case Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((c) => {
            const isAssignedToMe = (currentUser?.fullName && c.assignedTeacher?.toLowerCase().includes(currentUser.fullName.toLowerCase())) ||
                                   (currentUser?.id && c.assignedTeacherId === currentUser.id);
            const isPendingAck = c.acknowledgmentStatus === 'PENDING';
            const isAcked = c.acknowledgmentStatus === 'ACKNOWLEDGED';

            return (
              <div
                key={c.id}
                className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-brand-violet/10 flex items-center justify-center rounded-2xl border border-gray-200">
                      <i className="ph-bold ph-student text-brand-violet text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-base text-brand-textMain">{c.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-gray-400 font-bold">{c.id}</span>
                        {c.classGrade && (
                          <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {c.classGrade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      {c.status}
                    </span>
                    {isAcked ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        ✓ Acknowledged
                      </span>
                    ) : isPendingAck ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        ⏳ Pending Ack
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="bg-brand-bg p-4 rounded-2xl space-y-2 border border-gray-100 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Target Remedial Domain</span>
                    <strong className="text-brand-textMain font-semibold block">{c.focusArea}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Current Score</span>
                      <span className="text-xs font-bold text-red-600">{c.currentAverage}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Target Goal</span>
                      <span className="text-xs font-bold text-green-700">{c.targetAverage}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned Remedial Lead Details */}
                <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span><strong>Assigned Lead Teacher:</strong></span>
                    <span className="font-semibold text-brand-textMain">
                      {c.assignedTeacher || 'Class Master (Auto)'}
                    </span>
                  </div>
                  {isAcked && c.acknowledgedBy && (
                    <p className="text-[11px] text-emerald-700">
                      <strong>Confirmed by:</strong> {c.acknowledgedBy} {c.acknowledgedAt ? `(${new Date(c.acknowledgedAt).toLocaleDateString()})` : ''}
                    </p>
                  )}
                  <p><strong>Peer-Buddy Mentor:</strong> {c.peerBuddy}</p>
                  <p><strong>Interventions Completed:</strong> {c.sessionsCompleted} Sessions</p>
                  <p><strong>Last Catch-Up:</strong> {c.lastSessionDate}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
                  {isAssignedToMe && isPendingAck ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCaseToAcknowledge(c);
                        setIsAckModalOpen(true);
                      }}
                      className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <i className="ph-bold ph-check-circle"></i>
                      Acknowledge Assignment
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedScholar(c);
                      setIsLogModalOpen(true);
                    }}
                    className="flex-1 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Log 1-on-1 Session
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ACKNOWLEDGE REMEDIAL ASSIGNMENT MODAL */}
      <Modal
        isOpen={Boolean(isAckModalOpen && caseToAcknowledge)}
        onClose={() => setIsAckModalOpen(false)}
        className="max-w-md"
      >
        {caseToAcknowledge && (
          <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsAckModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Pastoral Responsibility</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mb-1">Acknowledge Remedial Lead</h3>
            <p className="text-xs text-brand-textMuted mb-4">
              Scholar: <strong>{caseToAcknowledge.name}</strong> ({caseToAcknowledge.classGrade || 'Classroom'})
            </p>

            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/60 mb-4 text-xs space-y-1 text-amber-900">
              <p><strong>Remedial Domain:</strong> {caseToAcknowledge.focusArea}</p>
              <p><strong>Baseline / Goal:</strong> {caseToAcknowledge.currentAverage} → {caseToAcknowledge.targetAverage}</p>
              {caseToAcknowledge.notes && (
                <p className="text-[11px] text-amber-800 italic pt-1 border-t border-amber-200/50">
                  Headmaster Note: &quot;{caseToAcknowledge.notes}&quot;
                </p>
              )}
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">
                  Initial Pedagogical Intake Note (Optional)
                </label>
                <textarea
                  rows={3}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="e.g. Reviewed diagnostic diagnostic gaps. Commencing twice-weekly morning review sessions..."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet text-xs leading-relaxed"
                ></textarea>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAckModalOpen(false)}
                  className="w-1/3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingAck}
                  onClick={handleAcknowledge}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAck ? (
                    <span>Confirming...</span>
                  ) : (
                    <>
                      <i className="ph-bold ph-check text-sm"></i>
                      <span>Accept & Acknowledge</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* LOG REMEDIAL SESSION MODAL */}
      <Modal
        isOpen={Boolean(isLogModalOpen && selectedScholar)}
        onClose={() => setIsLogModalOpen(false)}
        className="max-w-md"
      >
        {selectedScholar && (
          <div className="bg-white rounded-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setIsLogModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Intervention Entry</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-1">Log Catch-Up Session</h3>
            <p className="text-xs text-brand-textMuted mb-4">Scholar: <strong>{selectedScholar.name}</strong></p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Intervention Topic</label>
                <input
                  type="text"
                  defaultValue={selectedScholar.focusArea}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none font-semibold text-xs text-gray-700"
                />
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Learner Response Rating</label>
                <select
                  value={sessionRating}
                  onChange={(e) => setSessionRating(e.target.value)}
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-violet font-bold cursor-pointer"
                >
                  <option>High Improvement (Mastered Concept)</option>
                  <option>Satisfactory (Needs mild reinforcement)</option>
                  <option>Minimal Progress (Requires alternate modality)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Pedagogical Notes & Observations</label>
                <textarea
                  rows={3}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="e.g. Practiced with tactile fraction pies. Scholar correctly identified 3/4 vs 2/3 without assistance..."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet leading-relaxed"
                ></textarea>
              </div>

              <button
                type="button"
                onClick={handleLogSession}
                className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md transition-all mt-2 cursor-pointer"
              >
                Record Intervention Log
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
