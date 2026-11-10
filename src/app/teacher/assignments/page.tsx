"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import CbtAssessmentBuilderModal from '@/components/cbt/CbtAssessmentBuilderModal';
import Modal from '@/components/ui/Modal';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  maxScore: number;
  submittedCount: number;
  totalCount: number;
  status: 'Active' | 'Closed' | 'Graded';
}

interface CbtExamItem {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passingScore: number;
}

export default function TeacherAssignments() {
  const [activeTab, setActiveTab] = useState<'homework' | 'cbt'>('homework');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCbtBuilderOpen, setIsCbtBuilderOpen] = useState(false);

  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [classScholarCount, setClassScholarCount] = useState(0);
  const [cbtExams, setCbtExams] = useState<CbtExamItem[]>([]);
  const [loadingCbt, setLoadingCbt] = useState(false);

  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [newMaxScore, setNewMaxScore] = useState(10);

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

        if (targetClass) {
          try {
            const studentsRes = await RoselandApi.sis.getStudents({ class_grade: targetClass });
            const list = Array.isArray(studentsRes?.data) ? studentsRes.data : Array.isArray(studentsRes) ? studentsRes : [];
            setClassScholarCount(list.length);
          } catch {}
        }
        
        try {
          const subRes = await RoselandApi.academic.getSubjects();
          const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
          if (subList.length > 0) {
            const names = subList.map((s: any) => s.name || s.subject_name).filter(Boolean);
            if (names.length > 0) {
              setAvailableSubjects(names);
              setNewSubject(names[0]);
            }
          }
        } catch {}
      } catch (err) {
        console.warn("Failed to load class registry", err);
      }
    };
    initClasses();
  }, []);

  // Load CBT Exams from Backend
  const loadCbtExams = useCallback(async () => {
    setLoadingCbt(true);
    try {
      const res = await RoselandApi.cbt.getExams();
      if (Array.isArray(res)) {
        setCbtExams(res);
      }
    } catch (err) {
      console.warn("Failed to fetch CBT exams", err);
    } finally {
      setLoadingCbt(false);
    }
  }, []);

  useEffect(() => {
    loadCbtExams();
  }, [loadCbtExams]);

  const handleCreateAssignment = () => {
    if (!newTitle.trim()) {
      toast.error("Please enter an assignment title.");
      return;
    }

    const newAss: Assignment = {
      id: `HW-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle,
      subject: newSubject,
      dueDate: newDueDate,
      maxScore: newMaxScore,
      submittedCount: 0,
      totalCount: classScholarCount || 0,
      status: 'Active'
    };

    setAssignments([newAss, ...assignments]);
    toast.success(`Published homework "${newTitle}"! Dispatched to Parent Portal.`);
    setIsModalOpen(false);
    setNewTitle('');
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Curriculum & Formative Assessment Studio • {assignedClass || 'Active Class'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Assignments & CBT Examinations
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Dispatch homework, administer computer-based tests, and sync grades to the SBA gradebook.
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

          {activeTab === 'homework' ? (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Create Homework Task
            </button>
          ) : (
            <button
              onClick={() => setIsCbtBuilderOpen(true)}
              className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Schedule CBT Assessment
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('homework')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'homework'
              ? 'bg-brand-violet text-white shadow-sm'
              : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Regular Homework Tasks ({assignments.length})
        </button>

        <button
          onClick={() => setActiveTab('cbt')}
          className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'cbt'
              ? 'bg-brand-violet text-white shadow-sm'
              : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          CBT Quizzes & Mock Exams ({cbtExams.length})
        </button>
      </div>

      {/* 1. HOMEWORK TAB */}
      {activeTab === 'homework' && (
        assignments.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-base font-serif font-bold text-brand-textMain">No Active Homework Tasks</h3>
            <p className="text-xs text-brand-textMuted max-w-md mx-auto">
              Create homework assignments to assign work to scholars and allow parents to monitor homework status.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs shadow-md transition-all inline-block mt-2"
            >
              Create First Homework Task
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((ass) => (
              <div key={ass.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold bg-brand-violetLight text-brand-violet px-2.5 py-1 rounded-lg uppercase">
                      {ass.subject}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      ass.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ass.status}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-brand-textMain leading-tight">
                    {ass.title}
                  </h3>
                  <p className="text-xs text-brand-textMuted mt-1">Due: {ass.dueDate} • Max Marks: {ass.maxScore} pts</p>

                  {/* Progress bar */}
                  <div className="mt-4 bg-brand-bg p-3.5 rounded-2xl border border-gray-100 space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-500">Submissions:</span>
                      <span className="text-brand-violet">{ass.submittedCount} / {ass.totalCount} Scholars</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-brand-violet h-full rounded-full transition-all"
                        style={{ width: `${ass.totalCount > 0 ? (ass.submittedCount / ass.totalCount) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => toast.success(`Viewing submissions for ${ass.title}`)}
                    className="flex-1 py-2.5 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-textMain font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Grade Submissions
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 2. CBT TAB */}
      {activeTab === 'cbt' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-xl text-brand-textMain">Scheduled CBT Assessment Cluster</h3>
              <p className="text-xs text-brand-textMuted mt-1">
                Examinations configured with live candidate portals and automated scoring.
              </p>
            </div>
            <button
              onClick={() => setIsCbtBuilderOpen(true)}
              className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              Schedule New Assessment
            </button>
          </div>

          {loadingCbt ? (
            <div className="p-12 text-center text-xs font-bold text-gray-400">
              Loading active CBT examination catalog...
            </div>
          ) : cbtExams.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3">
              <p className="font-serif font-bold text-lg text-brand-textMain">No CBT Examinations Scheduled</p>
              <p className="text-xs text-brand-textMuted">Click "Schedule New Assessment" to create your first computer-based test or quiz.</p>
              <button
                onClick={() => setIsCbtBuilderOpen(true)}
                className="px-5 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs shadow-md transition-all"
              >
                Launch Assessment Builder
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cbtExams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between hover:border-brand-violet transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold bg-purple-100 text-purple-800 px-2.5 py-1 rounded-lg uppercase">
                        {exam.id}
                      </span>
                      <span className="text-[11px] font-bold text-brand-violet bg-brand-bg px-2.5 py-1 rounded-lg">
                        {exam.classGrade}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base text-brand-textMain leading-snug">
                      {exam.title}
                    </h4>

                    <div className="bg-brand-bg p-3.5 rounded-2xl border border-gray-100 space-y-1.5 text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subject:</span>
                        <strong className="text-brand-textMain">{exam.subject}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration:</span>
                        <strong className="text-brand-violet font-mono">{exam.durationMinutes} Minutes</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Questions:</span>
                        <strong className="text-brand-textMain font-mono">{exam.totalQuestions || 5} MCQs</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pass Score:</span>
                        <strong className="text-emerald-700 font-mono">{exam.passingScore} / {exam.totalMarks} pts</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Link
                      href={`/cbt?examId=${exam.id}`}
                      target="_blank"
                      className="flex-1 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white text-center font-bold rounded-xl text-xs transition-all shadow-xs"
                    >
                      Candidate Preview
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE HOMEWORK MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish New Homework"
        subtitle="Formative Task Builder"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Homework Title *</label>
            <input
              type="text"
              placeholder="e.g. Fractions Practice (Page 44)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Subject</label>
              <select
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-violet font-bold"
              >
                {availableSubjects.length > 0 ? (
                  availableSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))
                ) : (
                  <option value="">No Subjects Found</option>
                )}
              </select>
            </div>
            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Max Score</label>
              <input
                type="number"
                value={newMaxScore}
                onChange={(e) => setNewMaxScore(Number(e.target.value))}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-brand-violet font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain uppercase mb-1">Submission Due Date *</label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-violet font-semibold"
            />
          </div>

          <button
            onClick={handleCreateAssignment}
            className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md transition-all mt-2 cursor-pointer"
          >
            Publish & Notify Parents
          </button>
        </div>
      </Modal>

      {/* CBT ASSESSMENT BUILDER MODAL */}
      <CbtAssessmentBuilderModal
        isOpen={isCbtBuilderOpen}
        onClose={() => setIsCbtBuilderOpen(false)}
        defaultClass={assignedClass}
        onSuccess={() => {
          loadCbtExams();
          setActiveTab('cbt');
        }}
      />

    </div>
  );
}
