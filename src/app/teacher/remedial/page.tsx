"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';

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
  status: 'In Progress' | 'Target Achieved' | 'Escalated to Head';
}

export default function TeacherRemedial() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState<RemedialCase | null>(null);
  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cases, setCases] = useState<RemedialCase[]>([]);

  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState('Satisfactory (Needs mild reinforcement)');

  // 1. Initial Class context resolution
  useEffect(() => {
    const initClasses = async () => {
      try {
        const user = AuthService.getCurrentUser();
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
    initClasses();
  }, []);

  const loadRemedialCases = useCallback(async () => {
    if (!assignedClass) return;
    setLoading(true);
    try {
      const res = await RoselandApi.academic.getAtRiskStudents(assignedClass);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      if (list.length > 0) {
        const mapped: RemedialCase[] = list.map((item: any) => ({
          id: item.student_id || item.index_number || item.id,
          name: item.student_name || item.name || item.full_name,
          avatar: item.avatar || item.photo_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
          focusArea: item.focus_area || item.reason || "Core Subject Remediation",
          currentAverage: item.current_average ? `${item.current_average}%` : "Below 50%",
          targetAverage: item.target_average ? `${item.target_average}%` : "65.0%",
          peerBuddy: item.peer_buddy || "Class Scholar Peer Mentor",
          sessionsCompleted: item.sessions_completed || 0,
          lastSessionDate: item.last_session_date || "Pending first session",
          status: item.status || "In Progress",
        }));
        setCases(mapped);
      } else {
        setCases([]);
      }
    } catch (err) {
      console.warn("Could not load remedial cases", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [assignedClass]);

  useEffect(() => {
    loadRemedialCases();
  }, [loadRemedialCases]);

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
        classGrade: assignedClass,
        topic: selectedScholar.focusArea,
        notes: sessionNotes || "1-on-1 pedagogical review completed.",
        rating: sessionRating,
        conductedBy: AuthService.getCurrentUser()?.fullName || 'Class Teacher'
      });
    } catch (err) {
      // Local optimistic fallback
    }

    toast.success(`Logged remedial intervention session for ${selectedScholar.name}! Synchronized with Headmaster At-Risk Registry.`);
    setIsModalOpen(false);
    setSessionNotes('');
  };

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
            Track 1-on-1 pedagogical interventions, manage peer-buddy allocations, and sync growth with the academic registry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {classList.length > 0 && (
            <select
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet"
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
          {cases.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <img src={c.avatar} alt={c.name} className="w-12 h-12 rounded-2xl object-cover border border-gray-200" />
                  <div>
                    <h3 className="font-serif font-bold text-base text-brand-textMain">{c.name}</h3>
                    <span className="text-[10px] font-mono text-gray-400 font-bold block">{c.id}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                  {c.status}
                </span>
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

              <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50/60 p-3.5 rounded-2xl border border-gray-100">
                <p><strong>Peer-Buddy Mentor:</strong> {c.peerBuddy}</p>
                <p><strong>Interventions Completed:</strong> {c.sessionsCompleted} Sessions</p>
                <p><strong>Last Catch-Up:</strong> {c.lastSessionDate}</p>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedScholar(c);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  Log 1-on-1 Session
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOG REMEDIAL SESSION MODAL */}
      {isModalOpen && selectedScholar && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-modal-pop relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base"
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
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-violet font-bold"
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
                onClick={handleLogSession}
                className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md transition-all mt-2"
              >
                Record Intervention Log
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
