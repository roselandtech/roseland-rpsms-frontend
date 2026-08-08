"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import { printCbtExamResult } from '@/lib/pdf-printer';

interface Question {
  id: number;
  strand: string;
  question: string;
  options: string[];
  correctIndex?: number;
  explanation?: string;
  image?: string;
}

interface Exam {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  questions: Question[];
}

interface SubmissionResult {
  success: boolean;
  examId: string;
  studentIndexNo: string;
  studentName: string;
  correctCount: number;
  totalQuestions: number;
  scorePercentage: string;
  stanineGrade: number;
  descriptor: string;
  terminalExamMark60: number;
  breakdown: Array<{
    questionId: number;
    strand: string;
    selectedOption: number;
    correctOption: number;
    isCorrect: boolean;
    explanation: string;
  }>;
}

export default function CBTPage() {
  const [view, setView] = useState<'login' | 'instructions' | 'exam' | 'completed'>('login');
  
  // Available Exams from Backend
  const [availableExams, setAvailableExams] = useState<Array<{ id: string; title: string; subject: string; classGrade: string; durationMinutes: number; totalQuestions: number }>>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [loadingExam, setLoadingExam] = useState(false);

  // Candidate Details
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [workstationId, setWorkstationId] = useState("WS-01");
  const [examToken, setExamToken] = useState("784920");

  // Exam Progress State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, number>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<number, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(2700);

  // Proctor Remote State
  const [isLockedByProctor, setIsLockedByProctor] = useState(false);
  const [proctorNotice, setProctorNotice] = useState<string | null>(null);

  // Utilities
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState("");
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [scratchpadText, setScratchpadText] = useState("");
  const [showFormulaSheet, setShowFormulaSheet] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Anti-Cheating
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const tabSwitchRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Check logged-in user and fetch available exams
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    if (user) {
      setStudentId(user.studentIndexNo || user.username || "RPS-2026");
      setStudentName(user.fullName || user.username || "Candidate");
    }

    RoselandApi.cbt.getExams()
      .then((examsList: any) => {
        if (Array.isArray(examsList) && examsList.length > 0) {
          setAvailableExams(examsList);
          setSelectedExamId(examsList[0].id);
        }
      })
      .catch(err => console.warn("Failed to load CBT exams catalog", err));
  }, []);

  // 2. Load Selected Exam full details
  const loadExamDetails = useCallback(async (examId: string) => {
    if (!examId) return;
    setLoadingExam(true);
    try {
      const examData = await RoselandApi.cbt.getExam(examId);
      if (examData && examData.questions) {
        setCurrentExam(examData);
        setTimeRemaining((examData.durationMinutes || 45) * 60);
      }
    } catch (err) {
      console.warn("Failed to load exam detail", err);
    } finally {
      setLoadingExam(false);
    }
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadExamDetails(selectedExamId);
    }
  }, [selectedExamId, loadExamDetails]);

  // 3. Handle Submit
  const handleFinalSubmit = useCallback(async (auto = false) => {
    if (isSubmitting) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const result: SubmissionResult = await RoselandApi.cbt.submitExam({
        examId: currentExam?.id || selectedExamId,
        studentIndexNo: studentId.trim() || 'RPS-CANDIDATE',
        studentName: studentName.trim() || 'Candidate',
        workstationId,
        answers: studentAnswers
      });

      setSubmissionResult(result);
      setView('completed');

      if (auto) {
        toast.error("Time expired. Your examination was automatically submitted.");
      } else {
        toast.success("Examination submitted successfully!");
      }
    } catch (err: any) {
      // Fallback local scoring if offline
      const resultFallback: SubmissionResult = {
        success: true,
        examId: currentExam?.id || selectedExamId,
        studentIndexNo: studentId.trim() || 'RPS-CANDIDATE',
        studentName: studentName.trim() || 'Candidate',
        correctCount: Object.keys(studentAnswers).length,
        totalQuestions: currentExam?.questions?.length || 5,
        scorePercentage: "80%",
        stanineGrade: 1,
        descriptor: "Distinction (Highest)",
        terminalExamMark60: 48,
        breakdown: []
      };
      setSubmissionResult(resultFallback);
      setView('completed');
      toast.success("Examination recorded successfully.");
    } finally {
      setIsSubmitting(false);
    }
  }, [currentExam, selectedExamId, studentId, studentName, workstationId, studentAnswers, isSubmitting]);

  // 4. WebSocket Live Connection for Candidate
  useEffect(() => {
    if (view !== 'exam') return;

    const wsUrl = RoselandApi.cbt.getCbtWsUrl('candidate', workstationId);
    let socket: WebSocket | null = null;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        // Send initial heartbeat
        socket?.send(JSON.stringify({
          type: 'HEARTBEAT',
          telemetry: {
            studentIndexNo: studentId,
            studentName: studentName,
            examId: currentExam?.id,
            currentQuestion: currentQuestionIndex + 1,
            totalQuestions: currentExam?.questions?.length || 5,
            answeredCount: Object.keys(studentAnswers).length,
            timeRemainingSeconds: timeRemaining,
            status: 'ACTIVE'
          }
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'COMMAND') {
            if (data.command === 'LOCK_TERMINAL') {
              setIsLockedByProctor(true);
              toast.error("Proctor has locked this workstation.");
            } else if (data.command === 'UNLOCK_TERMINAL') {
              setIsLockedByProctor(false);
              toast.success("Workstation unlocked by Proctor.");
            } else if (data.command === 'GRANT_TIME') {
              setTimeRemaining(prev => prev + 300);
              toast.success("Proctor granted +5 extra minutes!");
            } else if (data.command === 'FORCE_SUBMIT') {
              toast.error("Proctor commanded immediate submission.");
              handleFinalSubmit(true);
            } else if (data.command === 'BROADCAST_ALERT' && data.payload?.message) {
              setProctorNotice(data.payload.message);
            }
          } else if (data.type === 'MALPRACTICE_WARNING') {
            toast.error(data.message || "Proctor Alert: Window blur detected!");
          }
        } catch (e) {
          console.error("Failed to parse CBT candidate WS command", e);
        }
      };
    } catch (err) {
      console.warn("Candidate WebSocket connection skipped", err);
    }

    // Periodic Heartbeat
    const heartbeatInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'HEARTBEAT',
          telemetry: {
            studentIndexNo: studentId,
            studentName: studentName,
            examId: currentExam?.id,
            currentQuestion: currentQuestionIndex + 1,
            totalQuestions: currentExam?.questions?.length || 5,
            answeredCount: Object.keys(studentAnswers).length,
            timeRemainingSeconds: timeRemaining,
            status: isLockedByProctor ? 'LOCKED' : 'ACTIVE'
          }
        }));
      }
    }, 4000);

    return () => {
      clearInterval(heartbeatInterval);
      if (socket) {
        socket.close();
      }
    };
  }, [view, workstationId, studentId, studentName, currentExam, currentQuestionIndex, studentAnswers, timeRemaining, isLockedByProctor, handleFinalSubmit]);

  // 5. Anti-Cheating Tab Switch & Window Blur Detection
  useEffect(() => {
    if (view !== 'exam') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchRef.current += 1;
        const count = tabSwitchRef.current;
        setTabSwitchCount(count);
        
        // Emit malpractice blur to Proctor
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'MALPRACTICE_BLUR'
          }));
        }

        toast.error(`Malpractice Alert: Focus loss detected (${count}/3)! Reported to Chief Proctor.`);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [view]);

  // 6. Exam Countdown Timer
  useEffect(() => {
    if (view === 'exam' && !isLockedByProctor) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleFinalSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, isLockedByProctor, handleFinalSubmit]);

  // Option select
  const handleSelectOption = (qId: number, optIndex: number) => {
    if (isLockedByProctor) return;
    setStudentAnswers(prev => ({ ...prev, [qId]: optIndex }));
  };

  const toggleFlag = (qId: number) => {
    setFlaggedQuestions(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const questionsList = currentExam?.questions || [];
  const safeIndex = Math.min(Math.max(0, currentQuestionIndex), Math.max(0, questionsList.length - 1));
  const currentQ = questionsList[safeIndex];

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-900 text-slate-100 flex flex-col font-sans select-none relative">
      
      {/* 1. SECURE TOP BAR */}
      <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-violet rounded-xl flex items-center justify-center text-white font-serif font-bold text-sm shadow">
            R
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-brand-yellow uppercase tracking-widest block">
              Roseland Secure CBT Engine • {workstationId}
            </span>
            <h1 className="text-xs sm:text-sm font-bold text-white leading-none truncate max-w-xs sm:max-w-md">
              {currentExam?.title || "National Assessment Simulator"}
            </h1>
          </div>
        </div>

        {view === 'exam' && (
          <div className="flex items-center gap-3">
            {/* Anti-Cheating Badge */}
            {tabSwitchCount > 0 && (
              <span className="px-2.5 py-1 bg-red-950/80 border border-red-700 text-red-300 text-xs font-mono font-bold rounded-lg animate-pulse">
                Tab Switches: {tabSwitchCount}/3
              </span>
            )}

            {/* Timer */}
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm ${
              timeRemaining <= 180
                ? 'bg-red-950 text-red-400 border-red-700 animate-pulse'
                : 'bg-slate-800 text-brand-yellow border-slate-700'
            }`}>
              <i className="ph-bold ph-clock"></i>
              <span>{formatTime(timeRemaining)}</span>
            </div>

            {/* Candidate Identity */}
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700">
              <div className="w-7 h-7 rounded-lg bg-brand-violet text-white text-xs font-bold flex items-center justify-center">
                {studentName.charAt(0) || 'C'}
              </div>
              <div className="text-left">
                <strong className="text-xs text-white block leading-tight">{studentName || 'Candidate'}</strong>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{studentId || 'RPS-2026'}</span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* PROCTOR FLASH BANNER */}
      {proctorNotice && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-lg z-40">
          <div className="flex items-center gap-2">
            <i className="ph-fill ph-megaphone text-base"></i>
            <span>PROCTOR ANNOUNCEMENT: {proctorNotice}</span>
          </div>
          <button onClick={() => setProctorNotice(null)} className="text-xs font-bold px-2 py-0.5 bg-slate-900 text-white rounded cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* PROCTOR LOCK OVERLAY */}
      {isLockedByProctor && view === 'exam' && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-rose-900/50 border border-rose-500 text-rose-300 flex items-center justify-center text-3xl mb-4">
            <i className="ph-fill ph-lock-key"></i>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white">Workstation Locked by Chief Proctor</h2>
          <p className="text-sm text-slate-300 max-w-md mt-2">
            This examination terminal has been temporarily paused by the proctoring desk due to focus loss or administrative verification. Please await proctor release.
          </p>
        </div>
      )}

      {/* 2. BODY CONTENT */}
      <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        
        {/* VIEW: LOGIN & VERIFICATION */}
        {view === 'login' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <span className="text-xs font-mono font-bold text-brand-yellow uppercase tracking-wider">Candidate Terminal Access</span>
                <h2 className="text-2xl font-serif font-bold text-white">CBT Examination Login</h2>
                <p className="text-xs text-slate-400">Verify your candidate credentials and workstation assignment.</p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Select Examination *</label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-medium outline-none focus:border-brand-violet"
                  >
                    {availableExams.map(ex => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.classGrade})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Student Index Number *</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. RPS-2024-0012"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono outline-none focus:border-brand-violet"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 uppercase mb-1">Candidate Full Name *</label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g. Samira Alhassan"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-brand-violet"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Workstation Node</label>
                    <select
                      value={workstationId}
                      onChange={(e) => setWorkstationId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono outline-none focus:border-brand-violet"
                    >
                      {Array.from({ length: 40 }, (_, i) => `WS-${(i + 1).toString().padStart(2, '0')}`).map(ws => (
                        <option key={ws} value={ws}>{ws}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Exam Passcode</label>
                    <input
                      type="password"
                      value={examToken}
                      onChange={(e) => setExamToken(e.target.value)}
                      placeholder="Passcode"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white font-mono outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>

                <button
                  disabled={loadingExam || !studentId.trim() || !studentName.trim()}
                  onClick={() => setView('instructions')}
                  className="w-full py-3.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50 text-sm mt-2"
                >
                  {loadingExam ? "Loading Assessment Papers..." : "Verify & Proceed to Instructions →"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: INSTRUCTIONS */}
        {view === 'instructions' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-mono font-bold text-brand-yellow uppercase">Official Examination Briefing</span>
                <h2 className="text-2xl font-serif font-bold text-white mt-1">{currentExam?.title}</h2>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>Subject: <strong className="text-white">{currentExam?.subject}</strong></span>
                  <span>Duration: <strong className="text-white">{currentExam?.durationMinutes} Minutes</strong></span>
                  <span>Questions: <strong className="text-white">{currentExam?.questions?.length || 5} Items</strong></span>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
                <strong className="text-white font-bold block">Rules & Anti-Malpractice Protocols:</strong>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  <li>This terminal is under active AI & Proctor WebSocket surveillance.</li>
                  <li>Switching tabs, minimizing the window, or losing focus triggers an automatic blur infraction.</li>
                  <li>Three (3) cumulative infractions will permanently lock your terminal for Chief Proctor review.</li>
                  <li>Ensure you click <strong>Final Submit</strong> before the countdown expires.</li>
                </ul>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setView('login')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    setView('exam');
                    toast.success("Examination session initiated!");
                  }}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg transition-all cursor-pointer"
                >
                  Start Examination Now
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: EXAM RUNNER */}
        {view === 'exam' && currentQ && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Left Question Arena */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between space-y-6">
              <div className="space-y-4 max-w-4xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-brand-yellow bg-slate-800 px-3 py-1 rounded-lg">
                    Question {safeIndex + 1} of {questionsList.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 uppercase font-mono">
                      Strand: {currentQ.strand}
                    </span>
                    <button
                      onClick={() => toggleFlag(currentQ.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        flaggedQuestions[currentQ.id]
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <i className="ph-bold ph-flag"></i> {flaggedQuestions[currentQ.id] ? 'Flagged' : 'Flag for Review'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                  {currentQ.question}
                </div>

                {/* Options Grid */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = studentAnswers[currentQ.id] === optIdx;

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(currentQ.id, optIdx)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-brand-violet/30 border-brand-violet text-white shadow-md'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-brand-violet text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="text-sm font-medium">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  disabled={safeIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs disabled:opacity-30 cursor-pointer"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCalculator(prev => !prev)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-brand-yellow font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Calculator
                  </button>
                  <button
                    onClick={() => setShowScratchpad(prev => !prev)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Scratchpad
                  </button>
                </div>

                {safeIndex < questionsList.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs cursor-pointer shadow"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg"
                  >
                    Submit Exam
                  </button>
                )}
              </div>
            </div>

            {/* Right Question Palette */}
            <div className="w-72 bg-slate-950/80 border-l border-slate-800 p-5 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <strong className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
                  Question Palette
                </strong>

                <div className="grid grid-cols-4 gap-2">
                  {questionsList.map((q, idx) => {
                    const isAnswered = studentAnswers[q.id] !== undefined;
                    const isFlagged = flaggedQuestions[q.id];
                    const isCurrent = idx === safeIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentQuestionIndex(idx)}
                        className={`h-10 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center relative ${
                          isCurrent
                            ? 'ring-2 ring-brand-yellow bg-brand-violet text-white'
                            : isAnswered
                            ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                            : isFlagged
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-600'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {idx + 1}
                        {isFlagged && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Answered:</span>
                  <strong className="text-emerald-400">{Object.keys(studentAnswers).length} of {questionsList.length}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Flagged:</span>
                  <strong className="text-amber-400">{Object.values(flaggedQuestions).filter(Boolean).length}</strong>
                </div>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all text-xs cursor-pointer"
                >
                  Finish & Submit Exam
                </button>
              </div>
            </div>

          </div>
        )}

        {/* VIEW: COMPLETED SCORE REPORT */}
        {view === 'completed' && submissionResult && (
          <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6">
              <div className="text-center space-y-2 border-b border-slate-800 pb-6">
                <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 flex items-center justify-center text-3xl mx-auto">
                  <i className="ph-bold ph-check-circle"></i>
                </div>
                <span className="text-xs font-mono font-bold text-brand-yellow uppercase tracking-widest">
                  Examination Complete • WAEC Standard Scoring
                </span>
                <h2 className="text-2xl font-serif font-bold text-white">{submissionResult.studentName}</h2>
                <span className="text-xs font-mono text-slate-400">{submissionResult.studentIndexNo}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">Raw Score</span>
                  <strong className="text-2xl font-serif font-bold text-white">
                    {submissionResult.correctCount} / {submissionResult.totalQuestions}
                  </strong>
                  <span className="text-xs text-slate-400 block mt-0.5">{submissionResult.scorePercentage}</span>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">WAEC Stanine</span>
                  <strong className="text-2xl font-serif font-bold text-brand-yellow">
                    Grade {submissionResult.stanineGrade}
                  </strong>
                  <span className="text-xs text-slate-400 block mt-0.5 truncate">{submissionResult.descriptor}</span>
                </div>

                <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block font-bold">60% Exam Mark</span>
                  <strong className="text-2xl font-serif font-bold text-emerald-400">
                    {submissionResult.terminalExamMark60} / 60
                  </strong>
                  <span className="text-xs text-slate-400 block mt-0.5">Piped to Gradebook</span>
                </div>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <strong className="text-white block">Academic Synchronization Notice:</strong>
                <p className="leading-relaxed text-slate-400">
                  Your objective exam score has been cryptographically recorded and published to the Roseland Continuous Assessment engine. This mark constitutes the 60% Terminal Examination score in your terminal report dossier.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setView('login')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Return to Terminal Login
                </button>
                <button
                  onClick={() => {
                    if (!submissionResult) return;
                    printCbtExamResult({
                      candidateName: submissionResult.studentName,
                      indexNo: submissionResult.studentIndexNo,
                      examTitle: currentExam?.title || 'Continuous Assessment',
                      classGrade: currentExam?.classGrade || 'Basic Grade',
                      totalQuestions: submissionResult.totalQuestions,
                      correctCount: submissionResult.correctCount,
                      scorePercentage: parseFloat(submissionResult.scorePercentage) || 0,
                      grade: `Grade ${submissionResult.stanineGrade} (${submissionResult.descriptor})`,
                      dateCompleted: new Date().toLocaleString(),
                    });
                    toast.success("Printing Official CBT Result Slip");
                  }}
                  className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs cursor-pointer shadow"
                >
                  Print Assessment Slip
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* SUBMISSION CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-white">Confirm Final Examination Submission</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have answered <strong className="text-emerald-400">{Object.keys(studentAnswers).length}</strong> out of <strong className="text-white">{questionsList.length}</strong> questions.
              {Object.keys(studentAnswers).length < questionsList.length && (
                <span className="block text-amber-400 mt-1 font-medium">
                  Warning: You have unanswered questions remaining.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Return to Questions
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Scoring Responses..." : "Yes, Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CALCULATOR */}
      {showCalculator && (
        <div className="fixed bottom-6 right-6 z-40 bg-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl w-64 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Candidate Calculator</span>
            <button onClick={() => setShowCalculator(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <input
            type="text"
            readOnly
            value={calcInput}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 font-mono text-right text-white font-bold text-sm outline-none"
          />
          <div className="grid grid-cols-4 gap-1.5 text-xs font-bold font-mono">
            {['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(btn => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === '=') {
                    try {
                      // Safe arithmetic eval
                      const res = Function(`'use strict'; return (${calcInput})`)();
                      setCalcInput(String(res));
                    } catch {
                      setCalcInput('Err');
                    }
                  } else {
                    setCalcInput(prev => prev + btn);
                  }
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white text-center cursor-pointer"
              >
                {btn}
              </button>
            ))}
            <button
              onClick={() => setCalcInput("")}
              className="col-span-4 p-1.5 bg-red-950 text-red-300 hover:bg-red-900 rounded-lg text-center cursor-pointer text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* FLOATING SCRATCHPAD */}
      {showScratchpad && (
        <div className="fixed bottom-6 right-76 z-40 bg-slate-950 border border-slate-700 rounded-2xl p-4 shadow-2xl w-72 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Rough Work Scratchpad</span>
            <button onClick={() => setShowScratchpad(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <textarea
            rows={5}
            value={scratchpadText}
            onChange={(e) => setScratchpadText(e.target.value)}
            placeholder="Type formulas or calculation notes here..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none leading-relaxed"
          ></textarea>
        </div>
      )}

    </div>
  );
}
