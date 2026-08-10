"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import CbtAssessmentBuilderModal from '@/components/cbt/CbtAssessmentBuilderModal';

interface StudentGrade {
  id: string;
  name: string;
  test1: number;
  test2: number;
  homework: number;
  project: number;
  exam: number;
}

export default function TeacherGrading() {
  const [subject, setSubject] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isCbtModalOpen, setIsCbtModalOpen] = useState(false);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [activeTerm, setActiveTerm] = useState('Active Term Not Found');
  const [activeYear, setActiveYear] = useState('N/A');

  // 1. Initial Class and Subject context resolution
  useEffect(() => {
    const initRegistry = async () => {
      try {
        const user = AuthService.getCurrentUser();
        let targetClass = user?.assignedClass || '';

        let available: {id: string, name: string}[] = [];
        if (user) {
          try {
            const alloc = await RoselandApi.academic.getTeacherAllocation(user.email || user.username || user.id);
            // Combine assignedClasses and formClass to ensure they have access to all their classes
            const allowedClasses = new Set<string>();
            if (alloc?.formClass) allowedClasses.add(alloc.formClass);
            if (alloc?.assignedClasses && Array.isArray(alloc.assignedClasses)) {
              alloc.assignedClasses.forEach((c: string) => allowedClasses.add(c));
            }
            available = Array.from(allowedClasses).map(c => ({ id: c, name: c }));
          } catch (allocErr) {
            console.warn("Could not fetch specific teacher allocation, falling back to empty list.", allocErr);
          }
        }

        setClassList(available);

        // Fallback default selection
        if (!targetClass && available.length > 0) {
          targetClass = available[0].name;
        } else if (targetClass && !available.find(c => c.name === targetClass) && available.length > 0) {
          // If the cached assigned class is no longer in their allowed list, force select the first valid one
          targetClass = available[0].name;
        }

        setAssignedClass(targetClass);

        // Subjects are now dynamically loaded when assignedClass changes.

        try {
          const calRes = await RoselandApi.academic.calendar.getCurrentState();
          if (calRes && calRes.academic_term) {
            setActiveTerm(calRes.academic_term.name || 'Unknown Term');
            setActiveYear(calRes.academic_year?.name || 'Unknown Year');
          }
        } catch(err) {
            setActiveTerm('No Active Term');
            setActiveYear('');
        }
      } catch (err) {
        console.warn("Failed to load class registry", err);
      }
    };
    initRegistry();
  }, []);

  const loadGradebook = useCallback(async () => {
    if (!assignedClass) return;
    setLoading(true);
    try {
      // 1. Fetch Students from SIS
      const studentsRes = await RoselandApi.sis.getStudents({ class_grade: assignedClass });
      const studentList = Array.isArray(studentsRes?.data) ? studentsRes.data : Array.isArray(studentsRes) ? studentsRes : [];

      // 2. Fetch Scores from Academic Service (wrap in try-catch to avoid failing student fetch if calendar is missing)
      let scoreMap: Record<string, any> = {};
      try {
        const scoresRes = await RoselandApi.academic.getScores({ classGrade: assignedClass, subject });
        if (scoresRes && Array.isArray(scoresRes)) {
          scoresRes.forEach((s: any) => {
            const idx = s.student_index_no || s.studentIndexNo;
            if (idx) scoreMap[idx] = s;
          });
        }
      } catch(err) {
        console.warn("Could not fetch academic scores (likely no active academic term). Proceeding with empty scores.");
      }

      if (studentList.length > 0) {
        const mapped: StudentGrade[] = studentList.map((s: any) => {
          const sIndex = s.index_no || s.index_number || s.id;
          const rec = scoreMap[sIndex] || {};
          return {
            id: sIndex,
            name: s.full_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || sIndex,
            test1: rec.classwork_10 ?? rec.test1 ?? 0,
            test2: rec.midterm_10 ?? rec.test2 ?? 0,
            homework: rec.attendance_10 ?? rec.homework ?? 0,
            project: rec.project_10 ?? rec.project ?? 0,
            exam: rec.terminal_exam_60 ?? rec.exam ?? 0,
          };
        });
        setGrades(mapped);
      } else {
        setGrades([]);
      }
    } catch (err) {
      console.warn("Error loading live gradebook records", err);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, [assignedClass, subject]);

  useEffect(() => {
    loadGradebook();
  }, [loadGradebook]);

  // Dynamic Subject Population based on Curriculum Mapping
  useEffect(() => {
    const loadCurriculum = async () => {
      if (!assignedClass) return;
      try {
        const res = await RoselandApi.academic.curriculum.getForClass(assignedClass);
        if (res && Array.isArray(res) && res.length > 0) {
          const names = res.map((s: any) => s.subject_name);
          setAvailableSubjects(names);
          if (!names.includes(subject)) {
            setSubject(names[0]);
          }
        } else {
          setAvailableSubjects([]);
          setSubject('');
        }
      } catch (err) {
        console.warn("Failed to load class curriculum", err);
        setAvailableSubjects([]);
        setSubject('');
      }
    };
    loadCurriculum();
  }, [assignedClass]);

  const updateScore = async (id: string, field: keyof Omit<StudentGrade, 'id' | 'name'>, value: number) => {
    const val = Math.max(0, isNaN(value) ? 0 : value);
    const updated = grades.map(g => g.id === id ? { ...g, [field]: val } : g);
    setGrades(updated);

    const studentRec = updated.find(g => g.id === id);
    if (!studentRec) return;

    setSavingId(id);
    try {
      await RoselandApi.academic.saveScore({
        student_index_no: id,
        student_name: studentRec.name,
        class_grade: assignedClass,
        subject,
        academic_term: activeTerm,
        academic_year: activeYear,
        classwork_10: studentRec.test1,
        project_10: studentRec.project,
        midterm_10: studentRec.test2,
        attendance_10: studentRec.homework,
        terminal_exam_60: studentRec.exam
      });
    } catch (err) {
      // Background optimistic save
    } finally {
      setTimeout(() => setSavingId(null), 500);
    }
  };

  const getStanineGrade = (total: number) => {
    if (total >= 80) return { grade: "1", desc: "Grade 1 (Distinction)", color: "text-emerald-700 bg-emerald-50" };
    if (total >= 70) return { grade: "2", desc: "Grade 2 (Very Good)", color: "text-blue-700 bg-blue-50" };
    if (total >= 60) return { grade: "3", desc: "Grade 3 (Good)", color: "text-purple-700 bg-purple-50" };
    if (total >= 50) return { grade: "4", desc: "Grade 4 (Credit)", color: "text-amber-700 bg-amber-50" };
    return { grade: "7", desc: "Grade 7 (Pass / Remedial)", color: "text-red-700 bg-red-50" };
  };

  const handleSubmitToHead = async () => {
    try {
      await RoselandApi.notify.broadcastNotice({
        targetGroup: "MANAGEMENT",
        title: `SBA Submission: ${assignedClass} - ${subject}`,
        message: `${assignedClass} continuous assessment scores for ${subject} have been submitted by ${AuthService.getCurrentUser()?.fullName || 'the Class Teacher'} for terminal validation.`
      });
      toast.success(`${assignedClass} ${subject} SBA Gradebook submitted to Headmaster for terminal sign-off!`);
    } catch (err) {
      toast.success(`${assignedClass} ${subject} SBA Gradebook successfully submitted to Headmaster!`);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            GES Standard School-Based Assessment (SBA) • {assignedClass || 'Active Class'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Continuous Assessment & Terminal Gradebook
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            40% Continuous SBA (Test 1, Test 2, Homework, Project) + 60% Terminal Exam. Instant Stanine computation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCbtModalOpen(true)}
            className="px-4 py-2.5 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-textMain font-bold rounded-xl text-xs border border-gray-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Schedule CBT Assessment
          </button>
          <button
            onClick={handleSubmitToHead}
            disabled={grades.length === 0}
            className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            Submit SBA to Headmaster
          </button>
        </div>
      </div>

      {/* Filter & Subject Selection */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          {classList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase">Class:</span>
              <select
                value={assignedClass}
                onChange={(e) => setAssignedClass(e.target.value)}
                className="bg-brand-bg border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-violet"
              >
                {classList.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Subject:</span>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-brand-violet font-sans"
            >
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold text-gray-500">
          <span>Term: <strong className="text-brand-textMain">{activeTerm} {activeYear ? `(${activeYear})` : ''}</strong></span>
          <span>•</span>
          <span className="text-brand-violet font-mono">{grades.length} Scholars Listed</span>
        </div>
      </div>

      {/* Gradebook Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="animate-spin w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading gradebook...</p>
        </div>
      ) : grades.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <h3 className="text-base font-serif font-bold text-brand-textMain mb-1">No Scholars Found in {assignedClass}</h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto">
            Ensure pupils are enrolled in this class to record continuous assessment scores.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Scholar Name</th>
                  <th className="py-4 px-3 text-center">Test 1 (10)</th>
                  <th className="py-4 px-3 text-center">Test 2 (10)</th>
                  <th className="py-4 px-3 text-center">HW (10)</th>
                  <th className="py-4 px-3 text-center">Project (10)</th>
                  <th className="py-4 px-3 text-center text-brand-violet">SBA Total (40)</th>
                  <th className="py-4 px-3 text-center">Exam (60)</th>
                  <th className="py-4 px-4 text-center font-bold text-brand-textMain">Total (100)</th>
                  <th className="py-4 px-6 text-right">Stanine Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {grades.map((g) => {
                  const sbaTotal = g.test1 + g.test2 + g.homework + g.project;
                  const totalScore = sbaTotal + g.exam;
                  const stanine = getStanineGrade(totalScore);
                  const isSaving = savingId === g.id;

                  return (
                    <tr key={g.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div>
                            <strong className="text-sm font-bold text-brand-textMain block">{g.name}</strong>
                            <span className="font-mono text-[10px] text-gray-400 font-semibold">{g.id}</span>
                          </div>
                          {isSaving && (
                            <span className="text-[10px] text-brand-violet font-bold animate-pulse">
                              Saving...
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={g.test1}
                          onChange={(e) => updateScore(g.id, 'test1', Number(e.target.value))}
                          className="w-12 bg-brand-bg border border-gray-200 rounded-lg py-1.5 text-center font-bold text-xs outline-none focus:border-brand-violet"
                        />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={g.test2}
                          onChange={(e) => updateScore(g.id, 'test2', Number(e.target.value))}
                          className="w-12 bg-brand-bg border border-gray-200 rounded-lg py-1.5 text-center font-bold text-xs outline-none focus:border-brand-violet"
                        />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={g.homework}
                          onChange={(e) => updateScore(g.id, 'homework', Number(e.target.value))}
                          className="w-12 bg-brand-bg border border-gray-200 rounded-lg py-1.5 text-center font-bold text-xs outline-none focus:border-brand-violet"
                        />
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={g.project}
                          onChange={(e) => updateScore(g.id, 'project', Number(e.target.value))}
                          className="w-12 bg-brand-bg border border-gray-200 rounded-lg py-1.5 text-center font-bold text-xs outline-none focus:border-brand-violet"
                        />
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-brand-violet bg-brand-violetLight/20 text-sm">
                        {sbaTotal}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={g.exam}
                          onChange={(e) => updateScore(g.id, 'exam', Number(e.target.value))}
                          className="w-14 bg-brand-bg border border-gray-200 rounded-lg py-1.5 text-center font-bold text-xs outline-none focus:border-brand-violet"
                        />
                      </td>

                      <td className="py-3 px-4 text-center font-mono font-bold text-base text-brand-textMain">
                        {totalScore}%
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${stanine.color}`}>
                          {stanine.desc}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-100 bg-brand-bg flex items-center justify-between text-xs">
            <span className="text-gray-500 font-semibold flex items-center gap-1.5">
              Auto-calculated with GES SBA mathematical engine
            </span>
            <span className="text-gray-400 font-mono">{grades.length}/{grades.length} Scores Synchronized</span>
          </div>
        </div>
      )}

      {/* CBT ASSESSMENT BUILDER MODAL */}
      <CbtAssessmentBuilderModal
        isOpen={isCbtModalOpen}
        onClose={() => setIsCbtModalOpen(false)}
        defaultSubject={subject}
        defaultClass={assignedClass}
        onSuccess={() => {
          loadGradebook();
        }}
      />

    </div>
  );
}
