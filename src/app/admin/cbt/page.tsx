"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import CbtAssessmentBuilderModal from '@/components/cbt/CbtAssessmentBuilderModal';

interface WorkstationNode {
  workstationId: string;
  studentIndexNo: string;
  studentName: string;
  examId: string;
  currentQuestion: number;
  totalQuestions: number;
  answeredCount: number;
  timeRemainingSeconds: number;
  malpracticeViolations: number;
  status: 'ACTIVE' | 'LOCKED' | 'SUBMITTED' | 'IDLE';
  lastPing: number;
}

interface ExamItem {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passingScore: number;
}

interface QuestionItem {
  id: number;
  strand: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function AdminCBTPage() {
  const [activeTab, setActiveTab] = useState<'surveillance' | 'exams' | 'questionbank'>('surveillance');
  const [nodes, setNodes] = useState<WorkstationNode[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'FLAGGED' | 'LOCKED' | 'SUBMITTED'>('ALL');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectedWs, setIsConnectedWs] = useState(false);

  // Exams & Question Bank Data
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExamQuestions, setSelectedExamQuestions] = useState<QuestionItem[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  // 1. Initial Load of Nodes & Exams
  const loadInitialData = useCallback(async () => {
    try {
      const [nodesRes, examsRes] = await Promise.allSettled([
        RoselandApi.cbt.getProctorNodes(),
        RoselandApi.cbt.getExams()
      ]);

      if (nodesRes.status === 'fulfilled' && Array.isArray(nodesRes.value)) {
        setNodes(nodesRes.value);
      }

      if (examsRes.status === 'fulfilled' && Array.isArray(examsRes.value)) {
        setExams(examsRes.value);
        if (examsRes.value.length > 0) {
          setSelectedExamId(prev => prev || examsRes.value[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not load initial CBT state", err);
    }
  }, []);

  // 2. Load Questions for selected exam
  const loadExamQuestions = useCallback(async (examId: string) => {
    if (!examId) return;
    setLoadingQuestions(true);
    try {
      const examDetail = await RoselandApi.cbt.getExam(examId);
      if (examDetail && Array.isArray(examDetail.questions)) {
        setSelectedExamQuestions(examDetail.questions);
      }
    } catch (err) {
      console.warn("Failed to load exam questions", err);
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (activeTab === 'questionbank' && selectedExamId) {
      loadExamQuestions(selectedExamId);
    }
  }, [activeTab, selectedExamId, loadExamQuestions]);

  // 3. Live WebSocket Connection for Real-Time Proctoring
  useEffect(() => {
    const wsUrl = RoselandApi.cbt.getCbtWsUrl('proctor');
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectWebSocket = () => {
      try {
        socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnectedWs(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'PROCTOR_TELEMETRY_UPDATE' && Array.isArray(data.nodes)) {
              setNodes(data.nodes);
            }
          } catch (e) {
            console.error("Failed to parse CBT WebSocket event", e);
          }
        };

        socket.onclose = () => {
          setIsConnectedWs(false);
          // Reconnect after 4s
          reconnectTimeout = setTimeout(connectWebSocket, 4000);
        };

        socket.onerror = () => {
          setIsConnectedWs(false);
          socket?.close();
        };
      } catch (err) {
        setIsConnectedWs(false);
        reconnectTimeout = setTimeout(connectWebSocket, 4000);
      }
    };

    connectWebSocket();

    // Fallback polling every 6 seconds if WS is disconnected
    const pollInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        RoselandApi.cbt.getProctorNodes()
          .then(data => {
            if (Array.isArray(data)) setNodes(data);
          })
          .catch(() => {});
      }
    }, 6000);

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollInterval);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  // 4. Remote Proctor Commands
  const handleGrantTime = async (workstationId: string) => {
    try {
      await RoselandApi.cbt.sendProctorCommand({
        command: 'GRANT_TIME',
        workstationId,
        payload: { extraMinutes: 5 }
      });
      setNodes(prev => prev.map(n => n.workstationId === workstationId ? { ...n, timeRemainingSeconds: n.timeRemainingSeconds + 300 } : n));
      toast.success(`Granted +5 extra minutes to terminal ${workstationId}`);
    } catch {
      toast.error(`Failed to grant time to ${workstationId}`);
    }
  };

  const handleToggleLock = async (workstationId: string) => {
    const target = nodes.find(n => n.workstationId === workstationId);
    if (!target) return;
    const isLocked = target.status === 'LOCKED';
    const nextCmd = isLocked ? 'UNLOCK_TERMINAL' : 'LOCK_TERMINAL';

    try {
      await RoselandApi.cbt.sendProctorCommand({
        command: nextCmd,
        workstationId
      });
      setNodes(prev => prev.map(n => n.workstationId === workstationId ? { ...n, status: isLocked ? 'ACTIVE' : 'LOCKED' } : n));
      toast.success(`Terminal ${workstationId} is now ${isLocked ? 'Unlocked' : 'Locked'}`);
    } catch {
      toast.error(`Could not execute lock command for ${workstationId}`);
    }
  };

  const handleForceSubmit = async (workstationId: string) => {
    try {
      await RoselandApi.cbt.sendProctorCommand({
        command: 'FORCE_SUBMIT',
        workstationId
      });
      setNodes(prev => prev.map(n => n.workstationId === workstationId ? { ...n, status: 'SUBMITTED', timeRemainingSeconds: 0 } : n));
      toast.success(`Force submitted examination for terminal ${workstationId}`);
    } catch {
      toast.error(`Could not force submit ${workstationId}`);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      toast.error("Please enter a message to broadcast");
      return;
    }
    try {
      await RoselandApi.cbt.sendProctorCommand({
        command: 'BROADCAST_ALERT',
        workstationId: 'ALL',
        payload: { message: broadcastMsg.trim() }
      });
      toast.success("Broadcast message displayed on all 40 ICT lab terminals");
    } catch {
      toast.error("Could not broadcast message to lab terminals");
    }
    setIsBroadcastModalOpen(false);
    setBroadcastMsg("");
  };

  const handleSyncHeartbeats = async () => {
    setIsSyncing(true);
    try {
      const data = await RoselandApi.cbt.getProctorNodes();
      if (Array.isArray(data)) setNodes(data);
      toast.success("Refreshed all 40 terminal network signals");
    } catch {
      toast.error("Failed to refresh terminal signals");
    } finally {
      setIsSyncing(false);
    }
  };

  // Node filtering
  const filteredNodes = nodes.filter(n => {
    if (filterStatus === 'ACTIVE') return n.status === 'ACTIVE';
    if (filterStatus === 'FLAGGED') return n.malpracticeViolations > 0;
    if (filterStatus === 'LOCKED') return n.status === 'LOCKED';
    if (filterStatus === 'SUBMITTED') return n.status === 'SUBMITTED';
    return true;
  });

  const activeCount = nodes.filter(n => n.status === 'ACTIVE').length;
  const lockedCount = nodes.filter(n => n.status === 'LOCKED').length;
  const submittedCount = nodes.filter(n => n.status === 'SUBMITTED').length;
  const flaggedCount = nodes.filter(n => n.malpracticeViolations > 0).length;

  const formatSeconds = (sec: number) => {
    if (sec <= 0) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            40-Node ICT Workstation Lab
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            CBT Lab Surveillance & Proctoring Engine
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Real-time terminal telemetry, anti-cheating tab-switch detection, remote workstation controls, and WAEC question banks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={isSyncing}
            onClick={handleSyncHeartbeats}
            className="px-4 py-2.5 bg-brand-bg hover:bg-gray-100 text-brand-textMain font-bold rounded-xl text-xs border border-gray-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <i className="ph-bold ph-arrows-clockwise"></i> {isSyncing ? "Syncing..." : "Sync Heartbeats"}
          </button>
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className="ph-bold ph-megaphone"></i> Broadcast to All Terminals
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('surveillance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'surveillance' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Live Lab Telemetry (40 Nodes)
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'exams' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Exams & Timetable ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('questionbank')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'questionbank' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          BECE Question Bank Studio
        </button>
      </div>

      {/* 1. SURVEILLANCE TAB */}
      {activeTab === 'surveillance' && (
        <div className="space-y-6">

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'ALL' ? 'bg-brand-textMain text-white' : 'bg-white border border-gray-200 text-brand-textMuted hover:bg-gray-50'
              }`}
            >
              All Nodes ({nodes.length})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'ACTIVE' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('FLAGGED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'FLAGGED' ? 'bg-rose-600 text-white' : 'bg-white border border-gray-200 text-rose-700 hover:bg-rose-50'
              }`}
            >
              Flagged Violations ({flaggedCount})
            </button>
            <button
              onClick={() => setFilterStatus('LOCKED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'LOCKED' ? 'bg-amber-600 text-white' : 'bg-white border border-gray-200 text-amber-700 hover:bg-amber-50'
              }`}
            >
              Locked ({lockedCount})
            </button>
            <button
              onClick={() => setFilterStatus('SUBMITTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                filterStatus === 'SUBMITTED' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Submitted ({submittedCount})
            </button>
          </div>

          {/* 40-Node Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredNodes.map((ws) => {
              const isAssigned = ws.studentIndexNo && ws.studentIndexNo.trim().length > 0;

              return (
                <div
                  key={ws.workstationId}
                  className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between space-y-4 ${
                    ws.malpracticeViolations > 0
                      ? 'border-rose-300 bg-rose-50/20'
                      : ws.status === 'LOCKED'
                      ? 'border-amber-300 bg-amber-50/20'
                      : ws.status === 'ACTIVE'
                      ? 'border-blue-200 bg-blue-50/10'
                      : 'border-gray-100 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-brand-bg text-brand-textMain">
                        {ws.workstationId}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ws.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-800' :
                        ws.status === 'LOCKED' ? 'bg-rose-100 text-rose-800' :
                        ws.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ws.status}
                      </span>
                    </div>

                    <strong className="text-sm font-bold text-brand-textMain block truncate">
                      {isAssigned ? ws.studentName : 'Unassigned Terminal'}
                    </strong>
                    <span className="text-[10px] font-mono text-gray-400 font-bold block mb-3">
                      {isAssigned ? ws.studentIndexNo : 'Ready for Candidate'}
                    </span>

                    <div className="bg-brand-bg p-3 rounded-2xl border border-gray-100 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold text-[10px]">Progress:</span>
                        <strong className="text-brand-textMain">
                          {isAssigned ? `${ws.answeredCount}/${ws.totalQuestions || 5} Answered` : 'Idle'}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold text-[10px]">Time Remaining:</span>
                        <strong className="text-brand-violet font-mono">
                          {isAssigned ? formatSeconds(ws.timeRemainingSeconds) : '--:--'}
                        </strong>
                      </div>
                      {ws.malpracticeViolations > 0 && (
                        <div className="flex justify-between text-rose-600 font-bold text-[10px] pt-1 border-t border-gray-200">
                          <span>Tab Switches:</span>
                          <span>{ws.malpracticeViolations} Violation(s)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                    <button
                      disabled={ws.status === 'IDLE' || ws.status === 'SUBMITTED'}
                      onClick={() => handleGrantTime(ws.workstationId)}
                      className="flex-1 py-1.5 bg-gray-100 hover:bg-brand-violet hover:text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                      title="Add +5 Minutes"
                    >
                      +5 Mins
                    </button>
                    <button
                      disabled={ws.status === 'IDLE' || ws.status === 'SUBMITTED'}
                      onClick={() => handleToggleLock(ws.workstationId)}
                      className={`flex-1 py-1.5 font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40 ${
                        ws.status === 'LOCKED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-100 text-amber-900 hover:bg-amber-500 hover:text-white'
                      }`}
                    >
                      {ws.status === 'LOCKED' ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      disabled={ws.status === 'IDLE' || ws.status === 'SUBMITTED'}
                      onClick={() => handleForceSubmit(ws.workstationId)}
                      className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white font-bold text-[10px] rounded-lg transition-all cursor-pointer disabled:opacity-40"
                      title="Force Submit"
                    >
                      <i className="ph-bold ph-stop"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* 2. EXAMS & TIMETABLE TAB */}
      {activeTab === 'exams' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-xl text-brand-textMain">Active CBT Examination Schedule</h3>
              <p className="text-xs text-brand-textMuted mt-1">Official NaCCA and WAEC standard examinations provisioned on the CBT cluster.</p>
            </div>
            <button
              onClick={() => setIsAssessmentModalOpen(true)}
              className="px-4 py-2 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-plus"></i> Schedule New Assessment
            </button>
          </div>

          {exams.length === 0 ? (
            <div className="text-center py-16 bg-brand-bg/40 rounded-3xl border border-dashed border-gray-200 space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-gray-100 flex items-center justify-center mx-auto text-brand-violet text-xl">
                <i className="ph-bold ph-exam"></i>
              </div>
              <h4 className="text-sm font-bold text-brand-textMain">No CBT Examinations Scheduled Yet</h4>
              <p className="text-xs text-brand-textMuted max-w-md mx-auto">
                Deploy curriculum-aligned WAEC and NaCCA examination items or practice tests to the 40-node computer lab cluster.
              </p>
              <button
                onClick={() => setIsAssessmentModalOpen(true)}
                className="px-4 py-2 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <i className="ph-bold ph-plus"></i> Schedule First Assessment
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.map((ex) => (
                <div key={ex.id} className="bg-brand-bg/50 border border-gray-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-md">
                      {ex.id}
                    </span>
                    <span className="text-xs font-bold text-brand-textMain bg-white px-2.5 py-1 rounded-md border border-gray-200">
                      {ex.classGrade}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-base text-brand-textMain">{ex.title}</h4>
                    <span className="text-xs text-brand-textMuted font-medium">{ex.subject}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs bg-white p-3 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 block text-[10px] font-bold">Duration</span>
                      <strong className="text-brand-textMain">{ex.durationMinutes} Mins</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] font-bold">Questions</span>
                      <strong className="text-brand-textMain">{ex.totalQuestions} Items</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] font-bold">Passing Mark</span>
                      <strong className="text-emerald-700">{ex.passingScore} / {ex.totalMarks}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-[11px] text-gray-500 font-medium">Ready for Lab Deployment</span>
                    <button
                      onClick={() => {
                        setSelectedExamId(ex.id);
                        setActiveTab('questionbank');
                      }}
                      className="text-xs font-bold text-brand-violet hover:underline cursor-pointer"
                    >
                      View Question Bank →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. QUESTION BANK TAB */}
      {activeTab === 'questionbank' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-xl text-brand-textMain">NaCCA & WAEC Question Bank Repository</h3>
              <p className="text-xs text-brand-textMuted mt-1">Live item bank verified with standard explanations and scoring keys.</p>
            </div>
            
            {exams.length > 0 && (
              <div className="flex items-center gap-3">
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-brand-textMain outline-none cursor-pointer"
                >
                  {exams.map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {exams.length === 0 ? (
            <div className="text-center py-16 bg-brand-bg/40 rounded-3xl border border-dashed border-gray-200 space-y-3">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-gray-100 flex items-center justify-center mx-auto text-brand-violet text-xl">
                <i className="ph-bold ph-books"></i>
              </div>
              <h4 className="text-sm font-bold text-brand-textMain">No Examination Question Banks Available</h4>
              <p className="text-xs text-brand-textMuted max-w-md mx-auto">
                Schedule or generate an assessment in the CBT studio to populate syllabus question banks and scoring keys.
              </p>
              <button
                onClick={() => setIsAssessmentModalOpen(true)}
                className="px-4 py-2 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <i className="ph-bold ph-plus"></i> Launch Assessment Builder
              </button>
            </div>
          ) : loadingQuestions ? (
            <div className="py-12 text-center text-xs text-gray-400 font-bold">
              Loading syllabus question bank items...
            </div>
          ) : selectedExamQuestions.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-bold">
              No questions found for this examination catalog.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {selectedExamQuestions.map((q, idx) => (
                <div key={q.id || idx} className="py-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2 py-0.5 rounded-md">
                        Item #{q.id}
                      </span>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Strand: {q.strand}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Option #{q.correctIndex + 1} Correct
                    </span>
                  </div>

                  <strong className="text-sm text-brand-textMain block font-medium">
                    {q.question}
                  </strong>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                          optIdx === q.correctIndex
                            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-brand-bg/60 border-gray-200 text-brand-textMain'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          optIdx === q.correctIndex ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span className="truncate">{opt}</span>
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-950">
                      <strong className="font-bold block mb-0.5">Syllabus Pedagogical Explanation:</strong>
                      <p className="leading-relaxed text-[11px]">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BROADCAST MODAL */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-fade-in relative">
            <button
              onClick={() => setIsBroadcastModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base cursor-pointer"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Proctor Alert</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-4">Broadcast to 40 Lab Nodes</h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-brand-textMain uppercase mb-1">Message to Candidates *</label>
                <textarea
                  rows={3}
                  value={broadcastMsg}
                  onChange={(e) => setBroadcastMsg(e.target.value)}
                  placeholder="e.g. 5 minutes remaining! Ensure all questions have been reviewed before final submission."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 outline-none focus:border-brand-violet leading-relaxed"
                ></textarea>
              </div>

              <button
                onClick={handleSendBroadcast}
                className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md transition-all mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="ph-bold ph-megaphone"></i> Send Flash Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CBT ASSESSMENT BUILDER MODAL */}
      <CbtAssessmentBuilderModal
        isOpen={isAssessmentModalOpen}
        onClose={() => setIsAssessmentModalOpen(false)}
        onSuccess={(newExam) => {
          if (newExam && newExam.id) {
            setExams(prev => [newExam, ...prev]);
            setSelectedExamId(newExam.id);
          }
          setActiveTab('exams');
          loadInitialData();
        }}
      />

    </div>
  );
}
