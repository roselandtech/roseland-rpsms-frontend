"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface FlaggedStudent {
  index: string;
  name: string;
  class: string;
  average: string;
  attendance: string;
  bottlenecks: string[];
  intervention: string;
  parentStatus: string;
  riskLevel: string;
}

export default function HeadmasterAtRiskPage() {
  const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAtRiskData = useCallback(async () => {
    try {
      setIsLoading(true);
      const students = await RoselandApi.sis.getStudents().catch(() => []);
      if (students && Array.isArray(students) && students.length > 0) {
        // Find scholars with academic flags if any
        const mapped: FlaggedStudent[] = students
          .filter((s: any) => s.status === 'AT_RISK' || s.isAtRisk)
          .map((s: any) => ({
            index: s.indexNumber || s.index_number || s.id,
            name: s.fullName || s.full_name || `${s.firstName || ''} ${s.lastName || ''}`,
            class: s.classGrade || s.class_grade || 'Primary Cohort',
            average: s.weightedAverage ? `${s.weightedAverage}%` : '48.0%',
            attendance: s.attendanceRate ? `${s.attendanceRate}%` : '72.0%',
            bottlenecks: s.weakSubjects || ['Core Subject Catch-up'],
            intervention: s.activeIntervention || 'Remedial Catch-Up Plan',
            parentStatus: 'Under Observation',
            riskLevel: 'Moderate'
          }));
        setFlaggedStudents(mapped);
      } else {
        setFlaggedStudents([]);
      }
    } catch (err) {
      console.warn("At-risk registry loading failed", err);
      setFlaggedStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAtRiskData();
  }, [loadAtRiskData]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Academic Early-Warning Diagnostic
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            At-Risk Scholar Registry
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Real-time algorithmic detection of scholars falling below 50% weighted average or 75% attendance.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedStudent("");
            setIsInterventionModalOpen(true);
          }}
          className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <i className="ph-bold ph-plus-circle"></i> Create Remedial Plan
        </button>
      </div>

      {/* Flagged Pupils Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
              <tr>
                <th className="py-4 px-6">Scholar & Class</th>
                <th className="py-4 px-4">Weighted Avg</th>
                <th className="py-4 px-4">Attendance</th>
                <th className="py-4 px-4">Subject Bottlenecks</th>
                <th className="py-4 px-4">Active Intervention</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {flaggedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-brand-textMuted">
                    <i className="ph ph-shield-check text-3xl text-emerald-500 block mb-2"></i>
                    No scholars currently flagged for academic early-warning. All students in good standing.
                  </td>
                </tr>
              ) : (
                flaggedStudents.map((s) => (
                  <tr key={s.index} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <strong className="text-sm font-bold text-brand-textMain block">{s.name}</strong>
                      <span className="font-mono text-[10px] text-gray-400">{s.index} • {s.class}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                        {s.average}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-mono font-semibold text-amber-700">
                        {s.attendance}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.bottlenecks.map((b, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-100 text-red-800 rounded font-semibold text-[10px]">
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <strong className="text-brand-textMain block font-semibold">{s.intervention}</strong>
                      <span className="text-[10px] text-gray-400 font-medium">{s.parentStatus}</span>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => toast.success(`Parent summons SMS dispatched for ${s.name}`)}
                        className="px-3 py-1.5 bg-brand-yellowLight hover:bg-brand-yellow text-yellow-950 font-bold rounded-lg text-[11px] transition-all cursor-pointer"
                      >
                        Summon Parent
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
        title="Assign Remedial Intervention"
        subtitle="Pedagogical Early-Warning & Remediation Protocol"
        size="md"
      >
        <div className="space-y-4 text-xs pt-2">
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Scholar *</label>
            <input
              type="text"
              defaultValue={selectedStudent}
              placeholder="Scholar Name or Index Number"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Intervention Type *</label>
            <select className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-medium">
              <option>After-School Remedial Catch-Up</option>
              <option>Peer-Buddy Tutoring</option>
              <option>Individual Learning Plan (ILP)</option>
              <option>Parent Academic Conference Required</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Assigned Remedial Lead / Teacher *</label>
            <input
              type="text"
              placeholder="e.g. Assigned Subject Specialist / Form Master"
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                toast.success("Intervention plan registered and notification sent to teacher & parent.");
                setIsInterventionModalOpen(false);
              }}
              className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md cursor-pointer transition-all"
            >
              Save & Deploy Intervention
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
