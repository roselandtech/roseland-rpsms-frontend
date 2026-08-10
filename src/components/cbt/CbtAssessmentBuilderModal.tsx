"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';

interface QuestionDraft {
  id: number;
  strand: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface CbtAssessmentBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newExam: any) => void;
  defaultClass?: string;
  defaultSubject?: string;
}

import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';

import { useEffect } from 'react';
import Modal from '@/components/ui/Modal';

export default function CbtAssessmentBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  defaultClass = '',
  defaultSubject = ''
}: CbtAssessmentBuilderModalProps) {
  const { classes: classList } = useClasses();
  const { subjects: subjectList } = useSubjects();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [classGrade, setClassGrade] = useState(defaultClass);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  useEffect(() => {
    if (classList.length > 0 && !classGrade) {
      setClassGrade(defaultClass || classList[0].name);
    }
  }, [classList, defaultClass, classGrade]);

  useEffect(() => {
    if (subjectList.length > 0 && !subject) {
      setSubject(defaultSubject || subjectList[0].name);
    }
  }, [subjectList, defaultSubject, subject]);

  // Questions List
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      id: 1,
      strand: 'Core Curriculum Strand',
      question: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      explanation: ''
    }
  ]);

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  const currentQ = questions[activeQuestionIdx] || questions[0];

  const handleUpdateCurrentQuestion = (field: keyof QuestionDraft, value: any) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === activeQuestionIdx) {
        return { ...q, [field]: value };
      }
      return q;
    }));
  };

  const handleUpdateOption = (optIdx: number, val: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx === activeQuestionIdx) {
        const newOpts = [...q.options];
        newOpts[optIdx] = val;
        return { ...q, options: newOpts };
      }
      return q;
    }));
  };

  const handleAddQuestion = () => {
    const nextId = questions.length + 1;
    setQuestions(prev => [
      ...prev,
      {
        id: nextId,
        strand: currentQ.strand || 'Core Curriculum Strand',
        question: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: ''
      }
    ]);
    setActiveQuestionIdx(questions.length);
  };

  const handleRemoveQuestion = (idxToRemove: number) => {
    if (questions.length <= 1) {
      toast.error("An assessment must contain at least one question.");
      return;
    }
    const filtered = questions.filter((_, idx) => idx !== idxToRemove);
    setQuestions(filtered);
    setActiveQuestionIdx(Math.max(0, idxToRemove - 1));
  };

  // AI Copilot Question Generator
  const handleGenerateWithAi = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      let aiQuestions: QuestionDraft[] = [];

      if (subject === 'Mathematics') {
        aiQuestions = [
          {
            id: 1,
            strand: 'Algebra & Equations',
            question: 'Solve for x in the linear equation: 4x - 7 = 2x + 9.',
            options: ['x = 8', 'x = 4', 'x = 16', 'x = 2'],
            correctIndex: 0,
            explanation: '4x - 2x = 9 + 7 => 2x = 16 => x = 8.'
          },
          {
            id: 2,
            strand: 'Number & Numeration',
            question: 'Express 0.00345 in standard scientific form.',
            options: ['3.45 × 10^-3', '3.45 × 10^-2', '34.5 × 10^-4', '3.45 × 10^3'],
            correctIndex: 0,
            explanation: 'Shift decimal 3 places to the right: 3.45 × 10^-3.'
          },
          {
            id: 3,
            strand: 'Geometry & Measurement',
            question: 'Calculate the area of a circle with diameter 14 cm (Use π = 22/7).',
            options: ['154 cm²', '616 cm²', '44 cm²', '88 cm²'],
            correctIndex: 0,
            explanation: 'Radius r = 7 cm. Area = π * r² = (22/7) * 7 * 7 = 154 cm².'
          }
        ];
      } else if (subject === 'Computing') {
        aiQuestions = [
          {
            id: 1,
            strand: 'Computer Systems',
            question: 'Which of the following is an example of non-volatile primary storage?',
            options: ['Read-Only Memory (ROM)', 'Random Access Memory (RAM)', 'Cache Memory', 'Register'],
            correctIndex: 0,
            explanation: 'ROM retains its contents permanently even when power is turned off.'
          },
          {
            id: 2,
            strand: 'Network & Internet',
            question: 'What is the primary function of a router in a computer network?',
            options: ['Directs data packets between different networks', 'Converts AC to DC power', 'Prints physical documents', 'Compiles source code'],
            correctIndex: 0,
            explanation: 'Routers forward data packets across computer networks based on IP routing tables.'
          },
          {
            id: 3,
            strand: 'Information Security',
            question: 'Which protocol secures web browser communication using cryptographic encryption?',
            options: ['HTTPS', 'HTTP', 'FTP', 'Telnet'],
            correctIndex: 0,
            explanation: 'HTTPS encrypts communication over computer networks using TLS/SSL certificates.'
          }
        ];
      } else {
        aiQuestions = [
          {
            id: 1,
            strand: 'Diversity of Matter',
            question: 'Which of the following is a physical property of metals?',
            options: ['Good electrical conductivity', 'Low melting point', 'Brittleness', 'High electronegativity'],
            correctIndex: 0,
            explanation: 'Metals possess free delocalized electrons that enable high thermal and electrical conductivity.'
          },
          {
            id: 2,
            strand: 'Living Systems',
            question: 'What is the primary function of hemoglobin in human red blood cells?',
            options: ['Transport oxygen to body tissues', 'Fight pathogenic bacteria', 'Clot blood during injury', 'Produce digestive enzymes'],
            correctIndex: 0,
            explanation: 'Hemoglobin binds oxygen in the lungs and releases it into peripheral tissues.'
          },
          {
            id: 3,
            strand: 'Earth & Environment',
            question: 'Which greenhouse gas is primarily released through the burning of fossil fuels?',
            options: ['Carbon dioxide (CO2)', 'Argon (Ar)', 'Helium (He)', 'Oxygen (O2)'],
            correctIndex: 0,
            explanation: 'Combustion of hydrocarbons releases carbon dioxide, contributing to thermal radiation trapping.'
          }
        ];
      }

      setQuestions(aiQuestions);
      setActiveQuestionIdx(0);
      if (!title) {
        setTitle(`${classGrade} ${subject} Standard Assessment`);
      }
      setIsGeneratingAi(false);
      toast.success("AI Copilot drafted 3 syllabus-aligned questions!");
    }, 600);
  };

  // Submit and Save Exam
  const handleSaveExam = async () => {
    if (!title.trim()) {
      toast.error("Please provide an assessment title.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question #${i + 1} is empty. Please fill in the prompt.`);
        setActiveQuestionIdx(i);
        return;
      }
      const emptyOpts = q.options.filter(o => !o.trim());
      if (emptyOpts.length > 2) {
        toast.error(`Question #${i + 1} needs at least 2 non-empty answer options.`);
        setActiveQuestionIdx(i);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await RoselandApi.cbt.createExam({
        title: title.trim(),
        subject,
        classGrade,
        durationMinutes: Number(durationMinutes) || 30,
        totalMarks: questions.length * 10,
        passingScore: Math.round((questions.length * 10) * 0.5),
        questions: questions.map((q, idx) => ({
          id: idx + 1,
          strand: q.strand || 'Core Concept Mastery',
          question: q.question.trim(),
          options: q.options.map(o => o.trim() || 'Unspecified Option'),
          correctIndex: q.correctIndex,
          explanation: q.explanation.trim() || 'Standard curriculum grading rubric.'
        }))
      });

      if (res && res.exam) {
        toast.success("Assessment successfully created and deployed to the CBT lab!");
        onSuccess(res.exam);
        onClose();
      } else {
        toast.success("Assessment created successfully.");
        onSuccess({ title, subject, classGrade, durationMinutes, questions });
        onClose();
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create CBT assessment");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" hideHeader bodyClassName="!p-0">
      <div className="bg-white flex flex-col justify-between h-full p-6 sm:p-8">
        
        {/* Modal Header */}
        <div className="border-b border-gray-100 pb-4 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">
            Assessment & Item Bank Studio
          </span>
          <h2 className="text-2xl font-serif font-bold text-brand-textMain mt-0.5">
            Schedule & Author CBT Assessment
          </h2>
          <p className="text-xs text-brand-textMuted mt-1">
            Create standard curriculum assessments for classroom testing or official computer-based examinations.
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 text-xs">
          
          {/* Top Config Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-brand-bg/50 p-4 rounded-2xl border border-gray-100">
            <div className="sm:col-span-2">
              <label className="block font-bold text-brand-textMain uppercase mb-1">Assessment Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. JHS 2 Computing Mid-Term CBT Assessment"
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-brand-textMain font-medium outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Subject *</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-brand-textMain font-medium outline-none focus:border-brand-violet cursor-pointer"
              >
                {subjectList.length > 0 ? (
                  subjectList.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))
                ) : (
                  <option value="">No subjects registered</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Target Class *</label>
              <select
                value={classGrade}
                onChange={(e) => setClassGrade(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-brand-textMain font-medium outline-none focus:border-brand-violet cursor-pointer"
              >
                {classList.length > 0 ? (
                  classList.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))
                ) : (
                  <option value="">No classes registered</option>
                )}
              </select>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain uppercase mb-1">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-brand-textMain font-mono font-bold outline-none focus:border-brand-violet"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={isGeneratingAi}
                onClick={handleGenerateWithAi}
                className="w-full py-2.5 px-3 bg-brand-violet/10 hover:bg-brand-violet text-brand-violet hover:text-white font-bold rounded-xl border border-brand-violet/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <i className="ph-bold ph-sparkle"></i>
                {isGeneratingAi ? "AI Generating..." : "AI Question Copilot"}
              </button>
            </div>
          </div>

          {/* Question Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {questions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveQuestionIdx(idx)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeQuestionIdx === idx
                      ? 'bg-brand-violet text-white shadow-sm'
                      : 'bg-gray-100 text-brand-textMain hover:bg-gray-200'
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  {questions.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveQuestion(idx);
                      }}
                      className="hover:text-red-300 font-bold ml-1"
                      title="Remove question"
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <i className="ph-bold ph-plus"></i> Add Item
              </button>
            </div>

            <span className="text-[11px] font-bold text-gray-400">
              Total Marks: {questions.length * 10} pts
            </span>
          </div>

          {/* Active Question Editor */}
          {currentQ && (
            <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-serif font-bold text-sm text-brand-textMain">
                  Question Item #{activeQuestionIdx + 1} Details
                </span>
                <div className="w-64">
                  <input
                    type="text"
                    value={currentQ.strand}
                    onChange={(e) => handleUpdateCurrentQuestion('strand', e.target.value)}
                    placeholder="Syllabus Strand / Topic"
                    className="w-full bg-brand-bg border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] font-medium outline-none focus:border-brand-violet"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Question Prompt *</label>
                <textarea
                  rows={3}
                  value={currentQ.question}
                  onChange={(e) => handleUpdateCurrentQuestion('question', e.target.value)}
                  placeholder="Enter the examination question text..."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet text-brand-textMain font-medium leading-relaxed"
                ></textarea>
              </div>

              {/* 4 Multiple Choice Options */}
              <div className="space-y-2">
                <label className="block font-bold text-brand-textMain uppercase">
                  Options & Correct Answer Key (Click radio button to set correct option) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.options.map((opt, optIdx) => {
                    const isCorrect = currentQ.correctIndex === optIdx;

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                          isCorrect
                            ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-brand-bg border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correctOpt-${activeQuestionIdx}`}
                          checked={isCorrect}
                          onChange={() => handleUpdateCurrentQuestion('correctIndex', optIdx)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => handleUpdateOption(optIdx, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                          className="flex-1 bg-transparent border-none outline-none text-xs font-medium text-brand-textMain"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanation */}
              <div>
                <label className="block font-bold text-gray-500 uppercase mb-1">
                  Pedagogical Explanation / Marking Rationale (Shown upon exam completion)
                </label>
                <input
                  type="text"
                  value={currentQ.explanation}
                  onChange={(e) => handleUpdateCurrentQuestion('explanation', e.target.value)}
                  placeholder="e.g. Expand brackets and collect like terms to arrive at x = 8."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-2.5 outline-none focus:border-brand-violet text-brand-textMain text-xs"
                />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-100 pt-4 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveExam}
            className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <i className="ph-bold ph-check-circle"></i>
            {isSaving ? "Provisioning Exam..." : "Deploy Assessment to CBT Lab"}
          </button>
        </div>

      </div>
    </Modal>
  );
}
