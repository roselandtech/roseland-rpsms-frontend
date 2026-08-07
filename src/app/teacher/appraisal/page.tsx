"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService, RoselandUser } from '@/lib/auth';

interface TeacherDossier {
  id: string | null;
  teacher_id: string;
  name: string;
  role: string;
  assigned: string;
  ntcLicense: string;
  ntcPoints: string;
  performanceIndex: string;
  lessonPlanScore: string;
  walkthroughScore: string;
  status: string;
  scheduledDate?: string;
  scheduledTime?: string;
  observationFocus?: string;
  rubric: {
    domain1: { name: string; score: number; max: number; notes: string };
    domain2: { name: string; score: number; max: number; notes: string };
    domain3: { name: string; score: number; max: number; notes: string };
    domain4: { name: string; score: number; max: number; notes: string };
    domain5: { name: string; score: number; max: number; notes: string };
  };
  strengths: string[];
  growthAreas: string;
  evaluatedBy?: string;
  evaluatedAt?: string;
}

export default function TeacherAppraisalPage() {
  const [currentUser, setCurrentUser] = useState<RoselandUser | null>(null);
  const [dossier, setDossier] = useState<TeacherDossier | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDossier = useCallback(async () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const teacherKey = user.fullName || user.username || 'Educator';
      const data = await RoselandApi.academic.getTeacherAppraisal(teacherKey);
      setDossier(data);
    } catch (err: any) {
      console.error("Failed to load personal appraisal:", err);
      toast.error("Could not fetch supervisory appraisal dossier.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in">
      
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Professional Standards & NTC Compliance
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            My Pedagogical Appraisal & CPD
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Official supervisory evaluations across GES / NaCCA 5-Domain benchmarks and walkthrough observations.
          </p>
        </div>

        <button
          onClick={() => toast.success("Your official appraisal transcript has been compiled for export.")}
          className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <i className="ph-bold ph-file-arrow-down"></i> Export My Dossier
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-3xl p-16 border border-gray-100 shadow-sm text-center">
          <div className="w-10 h-10 border-3 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-brand-textMuted uppercase tracking-wider">Loading your pedagogical performance records...</p>
        </div>
      ) : !dossier ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center">
          <i className="ph ph-certificate text-4xl text-gray-300 block mb-2"></i>
          <h3 className="font-serif font-bold text-base text-brand-textMain">Appraisal Dossier Pending Initial Review</h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto mt-1">
            Your supervisory evaluation is currently queued. Once the Headmaster completes your first walkthrough evaluation, your 5-Domain rubrics will be visible here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Scheduled Walkthrough Alert (if scheduled) */}
          {dossier.scheduledDate && (
            <div className="p-5 rounded-3xl bg-linear-to-r from-purple-900 to-indigo-900 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shrink-0">
                  <i className="ph-fill ph-calendar-check text-amber-300"></i>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-purple-200 font-bold block">
                    Upcoming Supervisory Observation
                  </span>
                  <h3 className="font-serif font-bold text-base">
                    Classroom Walkthrough on {dossier.scheduledDate} at {dossier.scheduledTime || '09:30'}
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Focus: <span className="text-white font-semibold">{dossier.observationFocus || 'Curricular TLR & Pupil Engagement'}</span>
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-bold shrink-0">
                Scheduled by Administration
              </span>
            </div>
          )}

          {/* Profile & KPI Triad */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand-violetLight text-brand-violet font-bold flex items-center justify-center text-xl border border-brand-violet/20 shrink-0">
                  {(dossier.name || 'ED').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-brand-violet bg-brand-bg px-2 py-0.5 rounded border border-brand-violet/20">
                      {dossier.assigned || 'Faculty'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      dossier.status === 'Exemplary' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {dossier.status}
                    </span>
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-brand-textMain mt-1">
                    {dossier.name}
                  </h2>
                  <p className="text-xs text-brand-textMuted">
                    {dossier.role} • NTC License: <strong>{dossier.ntcLicense}</strong>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Overall Pedagogical Index</span>
                <strong className="text-3xl font-serif font-bold text-brand-violet">{dossier.performanceIndex}</strong>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 text-center">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Scheme Compliance</span>
                <strong className="text-lg font-bold text-brand-textMain block mt-1">{dossier.lessonPlanScore}</strong>
                <span className="text-[10px] text-gray-400">Weekly Lesson Plans Vetted</span>
              </div>
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 text-center">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">Rubric Evaluation</span>
                <strong className="text-lg font-bold text-amber-700 block mt-1">{dossier.walkthroughScore}</strong>
                <span className="text-[10px] text-gray-400">GES 5-Domain Benchmark</span>
              </div>
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 text-center">
                <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wider">NTC CPD Points</span>
                <strong className="text-lg font-bold text-brand-violet block mt-1">{dossier.ntcPoints}</strong>
                <span className="text-[10px] text-gray-400">Target: 50 Annual Credits</span>
              </div>
            </div>
          </div>

          {/* GES 5-Domain Rubric Breakdown */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">
                GES / NaCCA 5-Domain Evaluation Scorecard
              </h3>
              <p className="text-xs text-brand-textMuted mt-0.5">
                Official supervisory scorecard evaluated by {dossier.evaluatedBy || 'Headmaster'}.
              </p>
            </div>

            <div className="space-y-3">
              {Object.entries(dossier.rubric).map(([key, domain], idx) => (
                <div key={key} className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <strong className="text-xs font-bold text-brand-textMain">
                      Domain {idx + 1}: {domain.name}
                    </strong>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-brand-violet rounded-full" 
                          style={{ width: `${(domain.score / domain.max) * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-mono font-bold text-brand-violet text-sm">
                        {domain.score} / {domain.max}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    {domain.notes}
                  </p>
                </div>
              ))}
            </div>

            {/* Commendations & Growth Areas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div className="p-4 rounded-2xl bg-green-50/60 border border-green-100 text-xs space-y-1.5">
                <strong className="text-green-900 flex items-center gap-1.5">
                  <i className="ph-bold ph-thumbs-up"></i> Commendations & Strengths:
                </strong>
                <ul className="list-disc list-inside text-green-950 space-y-1">
                  {dossier.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100 text-xs space-y-1.5">
                <strong className="text-brand-violet flex items-center gap-1.5">
                  <i className="ph-bold ph-trend-up"></i> Supervisory Recommendations:
                </strong>
                <p className="text-purple-950 leading-relaxed">{dossier.growthAreas}</p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
